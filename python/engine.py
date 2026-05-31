"""Fraud-detection engine used by the Python backend.

The pipeline:
1. Loads transaction data from a NumPy array, CSV path, or DataFrame.
2. Engineers behavioral and merchant-risk features.
3. Applies weighted business rules.
4. Runs Isolation Forest anomaly scoring.
5. Combines both signals into a final fraud verdict.
"""

import copy
import json
import os
import re

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import warnings
import socketserver

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# 0. Dynamic Engine Configuration
# ─────────────────────────────────────────────────────────────────────────────

_DEFAULT_CONFIG = {
    "weights": {
        "flag_amount_zscore":     1.0,
        "flag_extreme_zscore":    1.5,
        "flag_high_amount":       1.0,
        "flag_night_tx":          0.5,
        "flag_cross_border":      0.5,
        "flag_high_risk_cat":     1.0,
        "flag_high_velocity":     1.5,
        "flag_burst":             2.5,
        "gift_card_spree":        2.5,
        "electronics_spree":      2.0,
        "flag_round_amount":      0.3,
        "flag_many_merchants":    0.5,
        "flag_device_multi":      2.0,
        "flag_ip_multi":          1.5,
        "is_test_charge_pattern": 2.0,
    },
    "descriptions": {
        "flag_high_amount":
            "Purchase amount (${amount}) is significantly higher "
            "than this card's usual spending (${card_mean_amount} average).",
        "flag_amount_zscore":
            "Transaction amount is highly unusual for this card "
            "(${amount_zscore} standard deviations from normal spending).",
        "flag_night_tx":
            "Transaction occurred during overnight hours "
            "(${hour}:00), when this type of activity is less common.",
        "flag_cross_border":
            "Purchase was made in ${merchant_country}, while the cardholder is based in "
            "${cardholder_country}.",
        "flag_high_velocity":
            "High transaction activity detected: "
            "${velocity_1h} other transactions were made on this card within the last hour.",
        "flag_burst":
            "Multiple purchases were made in quick succession "
            "(${velocity_burst} transactions within 15 minutes).",
        "flag_high_risk_cat":
            "Purchase was made with a merchant in a higher-risk category "
            "(${merchant_category}).",
        "gift_card_spree":
            "Multiple gift card purchases detected within the last 24 hours.",
        "electronics_spree":
            "Multiple electronics purchases detected within the last 24 hours.",
        "flag_round_amount":
            "Transaction amount is an exact round value (${amount}).",
        "flag_many_merchants":
            "This card has been used at an unusually large number of different merchants recently.",
        "flag_device_multi":
            "Device ${device_id} has been associated with multiple payment cards.",
        "flag_ip_multi":
            "IP address ${ip_address} has been associated with multiple payment cards.",
        "is_test_charge_pattern":
            "Possible card-testing behavior detected: a small transaction "
            "(${prev_amount}) was followed by a larger charge "
            "(${amount}).",
    },
    "ensemble": {
        "rule_weight": 0.6,
        "if_weight":   0.4,
    },
    "thresholds": {
        "suspicious": 0.30,
        "fraud":      0.50,
    },
}

# Live mutable config — mutated at runtime by the config TCP server
ENGINE_CONFIG = copy.deepcopy(_DEFAULT_CONFIG)


def _render_template(template: str, row) -> str:
    """Replace ${field} placeholders with values from a DataFrame row."""
    def _replacer(match):
        field = match.group(1)
        val = row.get(field, match.group(0))
        if isinstance(val, float):
            return f"{val:.2f}"
        return str(val)
    return re.sub(r"\$\{(\w+)\}", _replacer, template)


def get_config() -> dict:
    """Return a deep copy of the current engine config."""
    return copy.deepcopy(ENGINE_CONFIG)


def get_default_config() -> dict:
    """Return a deep copy of the factory-default config."""
    return copy.deepcopy(_DEFAULT_CONFIG)


def set_config(data: dict) -> dict:
    """Merge *data* into ENGINE_CONFIG and return the updated config."""
    global ENGINE_CONFIG
    for section in ("weights", "descriptions", "ensemble", "thresholds"):
        if section in data:
            ENGINE_CONFIG.setdefault(section, {})
            ENGINE_CONFIG[section].update(data[section])
    return get_config()


def load_config(path: str) -> bool:
    """Load config from a JSON file. Returns True on success."""
    if not os.path.isfile(path):
        return False
    try:
        with open(path, "r") as f:
            data = json.load(f)
        set_config(data)
        print(f"[CONFIG] Loaded config from {path}")
        return True
    except Exception as e:
        print(f"[CONFIG] Failed to load {path}: {e}")
        return False


def save_config(path: str) -> bool:
    """Persist current ENGINE_CONFIG to a JSON file."""
    try:
        with open(path, "w") as f:
            json.dump(ENGINE_CONFIG, f, indent=2)
        print(f"[CONFIG] Saved config to {path}")
        return True
    except Exception as e:
        print(f"[CONFIG] Failed to save {path}: {e}")
        return False

# ─────────────────────────────────────────────────────────────────────────────
# 1. Load data
# ─────────────────────────────────────────────────────────────────────────────
def load_data(source):
    """Normalize raw input into a clean transaction DataFrame.

    Args:
        source: A NumPy array with a header row, a CSV file path, or an
            existing pandas DataFrame.

    Returns:
        A DataFrame with numeric amounts, parsed timestamps, and rows with
        invalid amount/timestamp values removed.
    """
    if isinstance(source, np.ndarray):
        df = pd.DataFrame(source[1:], columns=source[0])
    elif isinstance(source, str):
        df = pd.read_csv(source)
    elif isinstance(source, pd.DataFrame):
        df = source.copy()
    else:
        raise ValueError("source must be ndarray, CSV path, or DataFrame")

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["amount", "timestamp"]).reset_index(drop=True)
    return df

# ─────────────────────────────────────────────────────────────────────────────
# 2. Feature engineering (Enriched & Vectorized)
# ─────────────────────────────────────────────────────────────────────────────
def engineer_features(df):
    """Create transaction, card, merchant, and velocity features.

    The engineered features are used by both the rule scorer and the
    Isolation Forest model.
    """
    df = df.sort_values(["card_id", "timestamp"]).reset_index(drop=True)

    # ── Time features ──
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek          # 0=Mon … 6=Sun
    df["is_night"] = df["hour"].between(0, 5).astype(int)
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)

    # ── Per-card statistics ──
    df["card_mean_amount"] = df.groupby("card_id")["amount"].transform("mean")
    df["card_std_amount"] = df.groupby("card_id")["amount"].transform("std").fillna(0)
    df["card_tx_count"] = df.groupby("card_id")["amount"].transform("count")
    df["amount_zscore"] = np.where(
        df["card_std_amount"] > 0,
        (df["amount"] - df["card_mean_amount"]) / df["card_std_amount"],
        0,
    )

    # ── Velocity: rolling 1-hour window (computed per card, mapped back) ──
    # We need the df sorted by card_id+timestamp (already done above).
    # Compute rolling counts on a timestamp-indexed copy, then assign via .values.
    velocity_1h = np.zeros(len(df), dtype=float)
    velocity_burst = np.zeros(len(df), dtype=float)
    for card, grp in df.groupby("card_id"):
        idx = grp.index  # original integer indices
        ts_grp = grp.set_index("timestamp").sort_index()
        v1h = ts_grp["amount"].rolling("1h").count().values - 1
        v15 = ts_grp["amount"].rolling("15min").count().values - 1
        velocity_1h[idx] = v1h
        velocity_burst[idx] = v15
    df["velocity_1h"] = velocity_1h
    df["velocity_burst"] = velocity_burst

    # ── Cross-border ──
    df["cross_border"] = (df["cardholder_country"] != df["merchant_country"]).astype(int)

    # ── High-risk merchant categories (tuned to actual data) ──
    HIGH_RISK = {"electronics", "gift_card", "travel"}
    df["high_risk_category"] = (
        df["merchant_category"].str.lower().str.strip().isin(HIGH_RISK).astype(int)
    )

    # ── Device / IP multi-card (kept for schema compat, computed correctly) ──
    # Check if any device/IP is used by more than one card
    df["device_multi_card"] = 0
    dev_mask = df["device_id"].notna() & (df["device_id"] != "")
    if dev_mask.any():
        dev_nunique = df.loc[dev_mask].groupby("device_id")["card_id"].transform("nunique")
        df.loc[dev_nunique.index, "device_multi_card"] = (dev_nunique > 1).astype(int)

    df["ip_multi_card"] = 0
    ip_mask = df["ip_address"].notna() & (df["ip_address"] != "")
    if ip_mask.any():
        ip_nunique = df.loc[ip_mask].groupby("ip_address")["card_id"].transform("nunique")
        df.loc[ip_nunique.index, "ip_multi_card"] = (ip_nunique > 1).astype(int)

    # ── Many distinct merchants in a short window ──
    # Flag cards that transact at an unusually high number of distinct merchants
    card_merchant_counts = df.groupby("card_id")["merchant_name"].transform("nunique")
    many_merchants_threshold = card_merchant_counts.quantile(0.75)
    df["many_merchants"] = (card_merchant_counts > many_merchants_threshold).astype(int)

    # ── Round amount flag ──
    df["flag_round_amount"] = (df["amount"] % 10 == 0).astype(int)



    # ── Gift card spree: ≥2 gift card purchases on the same card within 24h ──
    is_gift = df["merchant_category"].str.lower().str.strip() == "gift_card"
    df["is_gift_card_txn"] = is_gift.astype(int)
    df["gift_card_spree"] = 0
    gift_idx = df.index[is_gift]
    if len(gift_idx) > 0:
        df_gc = df.loc[gift_idx].copy()
        df_gc = df_gc.set_index("timestamp").sort_index()
        gc_counts = (
            df_gc.groupby("card_id")["amount"]
            .transform(lambda x: x.rolling("24h").count())
        )
        # Map back via the original integer index stored before set_index
        df_gc["_gc_count"] = gc_counts.values
        df_gc = df_gc.reset_index()
        # Align back: gift_idx preserves original order
        df.loc[gift_idx, "gift_card_spree"] = (df_gc["_gc_count"].values >= 2).astype(int)

    # ── Test-charge → large charge pattern ──
    # Small charge (<$5) followed by a large charge (>$150) on the same card
    df["prev_amount"] = df.groupby("card_id")["amount"].shift(1)
    df["is_test_charge_pattern"] = (
        (df["prev_amount"] < 5) & (df["amount"] > 150)
    ).astype(int)

    # ── Electronics spree: ≥2 electronics purchases on same card within 24h ──
    is_elec = df["merchant_category"].str.lower().str.strip() == "electronics"
    df["is_electronics_txn"] = is_elec.astype(int)
    df["electronics_spree"] = 0
    elec_idx = df.index[is_elec]
    if len(elec_idx) > 0:
        df_elec = df.loc[elec_idx].copy()
        df_elec = df_elec.set_index("timestamp").sort_index()
        elec_counts = (
            df_elec.groupby("card_id")["amount"]
            .transform(lambda x: x.rolling("24h").count())
        )
        df_elec["_elec_count"] = elec_counts.values
        df_elec = df_elec.reset_index()
        df.loc[elec_idx, "electronics_spree"] = (df_elec["_elec_count"].values >= 2).astype(int)

    return df

# ─────────────────────────────────────────────────────────────────────────────
# 3. Rule-based scoring (Layer 2)
# ─────────────────────────────────────────────────────────────────────────────
def score_rules(df):
    """Apply the weighted fraud heuristics and build human-readable triggers.

    Each binary flag contributes a fixed weight to ``rule_score``. The function
    also assembles a ``triggers`` string that explains why a row was flagged.
    """
    # ── Individual flags (binary) ──
    df["flag_high_amount"] = (df["amount"] > 500).astype(int)
    df["flag_amount_zscore"] = (df["amount_zscore"] > 3).astype(int)
    df["flag_extreme_zscore"] = (df["amount_zscore"] > 5).astype(int)
    df["flag_night_tx"] = df["is_night"]
    df["flag_cross_border"] = df["cross_border"]
    df["flag_high_velocity"] = (df["velocity_1h"] >= 3).astype(int)
    df["flag_burst"] = (df["velocity_burst"] >= 4).astype(int)
    df["flag_high_risk_cat"] = df["high_risk_category"]
    df["flag_device_multi"] = df["device_multi_card"]
    df["flag_ip_multi"] = df["ip_multi_card"]
    df["flag_many_merchants"] = df["many_merchants"]

    # ── Weighted rule score (reads from ENGINE_CONFIG) ──
    weights = ENGINE_CONFIG["weights"]

    score = np.zeros(len(df))
    for flag, weight in weights.items():
        if flag in df.columns:
            score += df[flag].values * weight

    df["rule_score"] = score

    # ── Human-readable trigger descriptions (reads from ENGINE_CONFIG) ──
    descriptions = ENGINE_CONFIG["descriptions"]

    triggers_list = []
    for _, row in df.iterrows():
        parts = []
        for flag, template in descriptions.items():
            if row.get(flag, 0) > 0:
                try:
                    parts.append(_render_template(template, row))
                except Exception:
                    parts.append(flag)
        triggers_list.append(" | ".join(parts) if parts else "")
    df["triggers"] = triggers_list

    return df

# ─────────────────────────────────────────────────────────────────────────────
# 4. Isolation Forest (Layer 3)
# ─────────────────────────────────────────────────────────────────────────────
def score_anomaly(df):
    """Score each transaction with Isolation Forest.

    Returns the raw anomaly score, a binary anomaly prediction, and a 0-1
    normalized anomaly score where higher values mean more anomalous.
    """
    feature_cols = [
        "amount", "amount_zscore", "hour", "velocity_1h",
        "velocity_burst", "cross_border", "high_risk_category",
        "is_night", "flag_round_amount",
    ]
    X = df[feature_cols].fillna(0).values

    iso = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X)

    # score_samples returns negative scores; more negative = more anomalous
    raw_scores = iso.score_samples(X)
    df["if_score"] = raw_scores
    df["if_anomaly"] = (iso.predict(X) == -1).astype(int)

    # Normalize to 0-1 (higher = more anomalous)
    min_s, max_s = raw_scores.min(), raw_scores.max()
    if max_s > min_s:
        df["if_score_norm"] = 1 - (raw_scores - min_s) / (max_s - min_s)
    else:
        df["if_score_norm"] = 0.0

    return df

# ─────────────────────────────────────────────────────────────────────────────
# 5. Ensemble Verdict (Layer 4)
# ─────────────────────────────────────────────────────────────────────────────
def ensemble_verdict(df):
    """Blend rule and anomaly scores into a final fraud score and verdict."""
    # Normalize rule_score to 0-1
    max_rule = df["rule_score"].max()
    if max_rule > 0:
        df["rule_score_norm"] = df["rule_score"] / max_rule
    else:
        df["rule_score_norm"] = 0.0

    # Weighted ensemble (reads from ENGINE_CONFIG)
    rule_w = ENGINE_CONFIG["ensemble"]["rule_weight"]
    if_w   = ENGINE_CONFIG["ensemble"]["if_weight"]
    df["fraud_score"] = (
        rule_w * df["rule_score_norm"]
        + if_w * df["if_score_norm"]
    )

    # Verdict cutoffs (reads from ENGINE_CONFIG)
    sus_thresh   = ENGINE_CONFIG["thresholds"]["suspicious"]
    fraud_thresh = ENGINE_CONFIG["thresholds"]["fraud"]
    df["fraud_verdict"] = pd.cut(
        df["fraud_score"],
        bins=[-np.inf, sus_thresh, fraud_thresh, np.inf],
        labels=["LEGITIMATE", "SUSPICIOUS", "FRAUD"],
    )

    return df

# ─────────────────────────────────────────────────────────────────────────────
# 6. Evaluation metrics
# ─────────────────────────────────────────────────────────────────────────────
def _normalize_label(value):
    if pd.isna(value):
        return None
    if isinstance(value, (bool, np.bool_)):
        return bool(value)
    if isinstance(value, (int, np.integer)):
        if value == 1:
            return True
        if value == 0:
            return False
    if isinstance(value, (float, np.floating)):
        if np.isnan(value):
            return None
        if value == 1.0:
            return True
        if value == 0.0:
            return False
    if isinstance(value, str):
        s = value.strip().lower()
        if s in {"fraud", "fraudulent", "positive", "pos", "yes", "y", "true", "1"}:
            return True
        if s in {"legit", "legitimate", "negative", "neg", "no", "n", "false", "0"}:
            return False
    return None


def compute_metrics(df, label_column=None, include_suspicious=False):
    """Compute precision, recall, and F1 when ground-truth labels are available.

    Args:
        df: DataFrame with fraud_verdict already computed.
        label_column: Optional label column name to use.
        include_suspicious: When True, treat SUSPICIOUS as positive.

    Returns:
        A dict with precision, recall, f1, and support, or None if labels are missing.
    """
    candidate_columns = [
        "label",
        "fraud_label",
        "is_fraud",
        "is_fraudulent",
        "actual_fraud",
        "ground_truth",
        "y_true",
        "target",
    ]
    label_col = label_column if label_column in df.columns else None
    if label_col is None:
        for col in candidate_columns:
            if col in df.columns:
                label_col = col
                break
    if label_col is None or "fraud_verdict" not in df.columns:
        return None

    positives = ["FRAUD"]
    if include_suspicious:
        positives.append("SUSPICIOUS")
    predicted_positive = df["fraud_verdict"].isin(positives)
    actual_labels = df[label_col].apply(_normalize_label)
    valid_mask = actual_labels.notna()
    if valid_mask.sum() == 0:
        return None

    actual = actual_labels[valid_mask].astype(bool)
    pred = predicted_positive[valid_mask].astype(bool)

    tp = int((pred & actual).sum())
    fp = int((pred & ~actual).sum())
    fn = int((~pred & actual).sum())
    tn = int((~pred & ~actual).sum())

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0

    return {
        "available": True,
        "label_column": label_col,
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1": round(float(f1), 4),
        "support": int(valid_mask.sum()),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 7. Plain Text Report
# ─────────────────────────────────────────────────────────────────────────────
def print_report(df):
    """Print a short summary of verdict counts and the top fraud cases."""
    legit = (df["fraud_verdict"] == "LEGITIMATE").sum()
    suspicious = (df["fraud_verdict"] == "SUSPICIOUS").sum()
    fraud = (df["fraud_verdict"] == "FRAUD").sum()

    print("=" * 50)
    print("  FRAUD DETECTION REPORT")
    print("=" * 50)
    print(f"  FRAUD:      {fraud:>5}")
    print(f"  SUSPICIOUS: {suspicious:>5}")
    print(f"  LEGITIMATE: {legit:>5}")
    print(f"  TOTAL:      {len(df):>5}")
    print("=" * 50)

    if fraud > 0:
        print("\n  TOP FRAUD TRANSACTIONS:")
        print("-" * 50)
        fraud_df = df[df["fraud_verdict"] == "FRAUD"].sort_values("fraud_score", ascending=False)
        for _, row in fraud_df.head(10).iterrows():
            print(f"  {row['transaction_id']}  ${row['amount']:>9.2f}  "
                  f"score={row['fraud_score']:.4f}  card={row['card_id']}")
            if row["triggers"]:
                # Wrap triggers for readability
                for trigger in row["triggers"].split(" | "):
                    print(f"    → {trigger}")
            print()

# ─────────────────────────────────────────────────────────────────────────────
# 8. Pipeline
# ─────────────────────────────────────────────────────────────────────────────
def run_pipeline(source, return_metrics=False):
    """Execute the full fraud pipeline from raw input to final verdicts."""
    df = load_data(source)
    df = engineer_features(df)
    df = score_rules(df)
    df = score_anomaly(df)
    df = ensemble_verdict(df)
    metrics = compute_metrics(df)
    print_report(df)

    if return_metrics:
        return df, metrics
    return df

if __name__ == "__main__":
    # Assuming transactions.csv is in the same directory
    data_array = np.genfromtxt("transactions.csv", delimiter=',', dtype=str, encoding='utf-8')
    results = run_pipeline(data_array)
    results.to_csv("fraud_results.csv", index=False)
    print(f"\nResults saved to fraud_results.csv ({len(results)} rows)")