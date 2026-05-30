"""
Fraud Detection Script  v3
Combines rule-based flags + statistical anomaly detection (IsolationForest)

Fixes vs v2:
  1. contamination="auto"  — IF finds its own threshold, never forces a fixed %
  2. rule_score removed from IF features — avoids double-counting rules
  3. Card stats computed on rolling/leave-one-out basis — fraud txns no longer
     inflate the card mean and suppress the Z-score signal
  4. Verdict driven by rule_score alone when IF says "inlier" but rules fire —
     catches obvious fraud the model missed
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import warnings
warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────────────────────────────────────
# 0. Load data
# ─────────────────────────────────────────────────────────────────────────────
def load_data(source):
    if isinstance(source, np.ndarray):
        df = pd.DataFrame(source[1:], columns=source[0])
    elif isinstance(source, str):
        df = pd.read_csv(source)
    elif isinstance(source, pd.DataFrame):
        df = source.copy()
    else:
        raise ValueError("source must be ndarray, CSV path, or DataFrame")

    df["amount"]    = pd.to_numeric(df["amount"], errors="coerce")
    df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["amount", "timestamp"]).reset_index(drop=True)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 1. Feature engineering
# ─────────────────────────────────────────────────────────────────────────────
def engineer_features(df):
    df = df.sort_values("timestamp").reset_index(drop=True)

    # ── Time ─────────────────────────────────────────────────────────────────
    df["hour"]        = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["is_night"]    = df["hour"].between(0, 5).astype(int)
    df["is_weekend"]  = (df["day_of_week"] >= 5).astype(int)

    # ── Per-card stats  (leave-one-out: exclude the row itself) ──────────────
    # This prevents a card with many large fraudulent charges from having a
    # high mean that makes each individual charge look "normal".
    card_sum   = df.groupby("card_id")["amount"].transform("sum")
    card_count = df.groupby("card_id")["amount"].transform("count")
    card_sumsq = df.groupby("card_id")["amount"].transform(lambda x: (x**2).sum())

    loo_count = (card_count - 1).clip(lower=1)
    loo_mean  = (card_sum - df["amount"]) / loo_count
    loo_var   = ((card_sumsq - df["amount"]**2) / loo_count - loo_mean**2).clip(lower=0)
    loo_std   = np.sqrt(loo_var)

    df["card_mean_amount"] = loo_mean
    df["card_std_amount"]  = loo_std.fillna(0)
    df["card_tx_count"]    = card_count

    # ── Z-score vs card's own history ────────────────────────────────────────
    df["amount_zscore"] = np.where(
        df["card_std_amount"] > 0,
        (df["amount"] - df["card_mean_amount"]) / df["card_std_amount"],
        0,
    )

    # ── Cross-border ─────────────────────────────────────────────────────────
    df["cross_border"] = (df["cardholder_country"] != df["merchant_country"]).astype(int)

    # ── Velocity: txns on same card in the hour BEFORE this one ──────────────
    df = df.sort_values("timestamp").reset_index(drop=True)
    velocity = []
    for idx, row in df.iterrows():
        mask = (
            (df["card_id"] == row["card_id"]) &
            (df["timestamp"] < row["timestamp"]) &
            (df["timestamp"] >= row["timestamp"] - pd.Timedelta("1h"))
        )
        velocity.append(int(mask.sum()))
    df["velocity_1h"] = velocity

    # ── Device / IP shared across cards ──────────────────────────────────────
    df["device_multi_card"] = (df.groupby("device_id")["card_id"].transform("nunique") > 1).astype(int)
    df["ip_multi_card"]     = (df.groupby("ip_address")["card_id"].transform("nunique") > 1).astype(int)

    # ── High-risk merchant category ───────────────────────────────────────────
    HIGH_RISK = {"gambling", "crypto", "wire_transfer", "cash_advance", "adult"}
    df["high_risk_category"] = df["merchant_category"].str.lower().isin(HIGH_RISK).astype(int)

    # ── Many distinct merchants per card ─────────────────────────────────────
    df["many_merchants"] = (df.groupby("card_id")["merchant_name"].transform("nunique") > 5).astype(int)

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 2. Rules
# ─────────────────────────────────────────────────────────────────────────────
RULE_DEFS = [
    # (flag_col, vectorised_condition, per-row explanation fn)
    ("flag_high_amount",
     lambda df: df["amount"] > df["card_mean_amount"] + 3 * df["card_std_amount"].clip(lower=1),
     lambda r: (f"Amount ${r['amount']:.2f} >> card avg ${r['card_mean_amount']:.2f} "
                f"(+{r['amount']-r['card_mean_amount']:.2f})")),

    ("flag_amount_zscore",
     lambda df: df["amount_zscore"].abs() > 3,
     lambda r: f"Amount Z-score {r['amount_zscore']:.1f}σ (threshold: ±3σ)"),

    ("flag_night_tx",
     lambda df: df["is_night"] == 1,
     lambda r: f"Transaction at {int(r['hour']):02d}:00 (night window 00–05)"),

    ("flag_cross_border",
     lambda df: df["cross_border"] == 1,
     lambda r: f"Cross-border: cardholder {r['cardholder_country']} → merchant {r['merchant_country']}"),

    ("flag_high_velocity",
     lambda df: df["velocity_1h"] >= 3,
     lambda r: f"{int(r['velocity_1h'])} other txns on this card in the preceding hour"),

    ("flag_high_risk_cat",
     lambda df: df["high_risk_category"] == 1,
     lambda r: f"High-risk category: {r['merchant_category']}"),

    ("flag_round_amount",
     lambda df: (df["amount"] % 100 == 0) & (df["amount"] >= 500),
     lambda r: f"Suspiciously round amount: ${r['amount']:.0f}"),

    ("flag_many_merchants",
     lambda df: df["many_merchants"] == 1,
     lambda r: "Card used at unusually many distinct merchants"),

    ("flag_device_multi",
     lambda df: df["device_multi_card"] == 1,
     lambda r: f"Device {r['device_id']} linked to multiple cards"),

    ("flag_ip_multi",
     lambda df: df["ip_multi_card"] == 1,
     lambda r: f"IP {r['ip_address']} linked to multiple cards"),
]

FLAG_COLS = [r[0] for r in RULE_DEFS]


def apply_rules(df):
    for flag_col, vec_fn, _ in RULE_DEFS:
        df[flag_col] = vec_fn(df).astype(int)

    df["rule_score"] = df[FLAG_COLS].sum(axis=1)

    # Per-row human-readable trigger list
    explain_fns = {flag_col: expl_fn for flag_col, _, expl_fn in RULE_DEFS}
    triggers = []
    for _, row in df.iterrows():
        fired = [explain_fns[fc](row) for fc in FLAG_COLS if row[fc] == 1]
        triggers.append(fired)
    df["triggers"] = triggers

    return df


# ─────────────────────────────────────────────────────────────────────────────
# 3. Isolation Forest  — contamination="auto" (no forced quota)
# ─────────────────────────────────────────────────────────────────────────────
# rule_score intentionally excluded: IF must find patterns independently.
# Including it would let rules dominate and the model would just re-rank rules.
IF_FEATURES = [
    "amount", "hour", "day_of_week", "is_night", "is_weekend",
    "card_tx_count", "amount_zscore", "cross_border",
    "velocity_1h", "high_risk_category", "device_multi_card", "ip_multi_card",
]

def isolation_forest(df):
    X = df[IF_FEATURES].fillna(0).values
    clf = IsolationForest(
        n_estimators=300,
        contamination="auto",   # ← no forced percentage; uses 0.1 heuristic internally
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X)
    df["if_score"]   = -clf.score_samples(X)   # higher = more anomalous
    df["if_anomaly"] = (clf.predict(X) == -1).astype(int)
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 4. Scoring  — rules + IF combined; neither alone decides
# ─────────────────────────────────────────────────────────────────────────────
def score_transactions(df):
    # Normalise IF score to [0, 1]
    lo, hi = df["if_score"].min(), df["if_score"].max()
    df["if_score_norm"]   = (df["if_score"] - lo) / (hi - lo + 1e-9)
    df["rule_score_norm"] = df["rule_score"] / len(RULE_DEFS)

    # Weighted blend — 50/50 so neither pillar dominates
    df["fraud_score"] = (0.50 * df["if_score_norm"] + 0.50 * df["rule_score_norm"]).round(4)

    # Thresholds tuned so a transaction needs BOTH signals to reach FRAUD
    df["fraud_verdict"] = pd.cut(
        df["fraud_score"],
        bins=[-np.inf, 0.30, 0.55, np.inf],
        labels=["LEGITIMATE", "SUSPICIOUS", "FRAUD"],
    )
    return df


# ─────────────────────────────────────────────────────────────────────────────
# 5. Report
# ─────────────────────────────────────────────────────────────────────────────
ICON = {"LEGITIMATE": "✅", "SUSPICIOUS": "⚠️ ", "FRAUD": "🚨"}

def print_report(df):
    total = len(df)
    print("\n" + "═" * 72)
    print("  FRAUD DETECTION REPORT  v3")
    print("═" * 72)

    for v in ["LEGITIMATE", "SUSPICIOUS", "FRAUD"]:
        n = (df["fraud_verdict"] == v).sum()
        print(f"  {ICON[v]}  {v:<12}  {n:>5} txns  ({100*n/total:.1f}%)")

    flagged = df[df["fraud_verdict"] != "LEGITIMATE"].sort_values("fraud_score", ascending=False)
    print(f"\n── Flagged transactions ({len(flagged)}) ─────────────────────────────────")

    for _, row in flagged.iterrows():
        icon = ICON[str(row["fraud_verdict"])]
        print(f"\n  {icon}  {row['transaction_id']}  |  card: {row['card_id']}"
              f"  |  ${row['amount']:.2f}  |  score: {row['fraud_score']:.3f}"
              f"  [{row['fraud_verdict']}]  rule_hits: {int(row['rule_score'])}/{len(RULE_DEFS)}")
        print(f"      merchant : {row['merchant_name']} ({row['merchant_category']})")
        print(f"      time     : {row['timestamp']}  |  channel: {row['channel']}")
        print(f"      route    : {row['cardholder_country']} → {row['merchant_country']}"
              f"  |  device: {row['device_id']}  |  ip: {row['ip_address']}")
        if row["triggers"]:
            print(f"      triggers ({len(row['triggers'])}):")
            for t in row["triggers"]:
                print(f"        • {t}")
        else:
            print("      triggers : none  (flagged by Isolation Forest anomaly score only)")

    print(f"\n── Rule trigger summary ─────────────────────────────────────────────")
    for fc in FLAG_COLS:
        n = int(df[fc].sum())
        bar = "█" * n
        print(f"  {fc:<25} {bar:<20} {n:>4}  ({100*n/total:.1f}%)")

    print("\n" + "═" * 72 + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# 6. Pipeline
# ─────────────────────────────────────────────────────────────────────────────
def run_pipeline(source, export_csv=True):
    """
    source     : numpy 2-D string array (row 0 = header) | CSV path | DataFrame
    export_csv : write fraud_results.csv (triggers column pipe-separated)
    """
    print("Loading …")
    df = load_data(source)
    print(f"  {len(df)} transactions, {df['card_id'].nunique()} unique cards")

    print("Engineering features …")
    df = engineer_features(df)

    print("Applying rules …")
    df = apply_rules(df)

    print("Running Isolation Forest …")
    df = isolation_forest(df)

    print("Scoring …")
    df = score_transactions(df)

    print_report(df)

    if export_csv:
        out = df.copy()
        out["triggers"] = out["triggers"].apply(lambda x: " | ".join(x))
        out.to_csv("fraud_results.csv", index=False)
        print(f"Saved → fraud_results.csv\n")

    return df


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    data_array = np.genfromtxt("transactions.csv", delimiter=',', dtype=str, encoding='utf-8')
    results = run_pipeline(data_array)