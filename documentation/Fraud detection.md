# Falcon Engine: 15 Types of Fraud Detection & Anomaly Rules

Falcon utilizes a sophisticated hybrid fraud detection engine that blends **15 deterministic compliance and behavioral rules** with an **unsupervised Isolation Forest machine learning model**. 

This document explains the 15 types of fraud detection rules executed by the engine, their operational criteria, mathematical weights, and how they contribute to the final transaction risk score.

---

## Ensemble Architecture Overview

When a batch of transactions is uploaded, Falcon processes them through a two-stage evaluation pipeline:

1. **Rule-Based Engine (60% Weight):** Evaluates each transaction against 15 predefined compliance, temporal, velocity, and network linkage rules. Each triggered rule adds a specific weight to the transaction's `rule_score`. The score is then normalized relative to the maximum triggered score in the dataset:
   $$\text{Rule Score (Normalized)} = \frac{\text{rule\_score}}{\max(\text{rule\_score})}$$

2. **Isolation Forest Model (40% Weight):** An unsupervised machine learning algorithm trained on behavioral features (e.g., amount Z-scores, velocity counts, device links). It outputs an anomaly score (`if_score_norm`) between 0 and 1, highlighting statistical deviations from cardholder and network baselines.

The final ensemble risk score is computed as:
$$\text{Final Fraud Score} = 0.6 \times \text{Rule Score (Normalized)} + 0.4 \times \text{if\_score\_norm}$$

Transactions are then classified into three risk tiers based on this score:
* **Legitimate:** $\le 0.30$
* **Suspicious (Review Queue):** $0.30 < \text{Score} \le 0.50$
* **Fraud (Flagged/Auto-Blocked):** $> 0.50$

---

## Detailed Catalog of the 15 Fraud Detection Rules

Below are the 15 detection rules grouped by their analytical category.

### 1. Amount & Baseline Anomalies

These rules analyze the transaction amount against absolute thresholds, baseline cardholder spending patterns, and formatting patterns.

#### Rule 1: High Transaction Amount (`flag_high_amount`)
* **Weight:** `1.0`
* **Criteria:** Transaction amount exceeds an absolute threshold of **$500.00**.
* **Rationale:** High-value transactions present the greatest financial exposure. Large, single charges are heavily targeted by fraudsters testing newly acquired stolen credentials before they are reported.

#### Rule 2: Amount Deviation (`flag_amount_zscore`)
* **Weight:** `1.0`
* **Criteria:** The amount exceeds the card's historical mean by more than **3 standard deviations** ($Z\text{-score} > 3$).
* **Rationale:** Cardholders typically transact within a standard personal range. A sudden deviation from this personal average is a strong indicator of unauthorized card use.

#### Rule 3: Extreme Amount Deviation (`flag_extreme_zscore`)
* **Weight:** `1.5`
* **Criteria:** The amount exceeds the card's historical mean by more than **5 standard deviations** ($Z\text{-score} > 5$).
* **Rationale:** A severe outlier in cardholder history (e.g., a cardholder who typically spends $20 suddenly charging $1,500) represents an extremely high probability of compromise.

#### Rule 4: Round Amount Formatting (`flag_round_amount`)
* **Weight:** `0.3`
* **Criteria:** The transaction amount is a round number divisible by **10** (e.g., $100.00, $50.00).
* **Rationale:** Regular shoppers rarely hit exact round numbers due to taxes and item pricing. Fraudulent transactions, particularly those involving digital services, cashouts, or donations, frequently use exact round figures.

---

### 2. Velocity & Burst Anomalies

These rules monitor frequency-over-time variables to catch automated attacks and rapid depletion of funds.

#### Rule 5: High Velocity (`flag_high_velocity`)
* **Weight:** `1.5`
* **Criteria:** Cardholder registers **3 or more transactions in the past hour** (excluding the current one).
* **Rationale:** Legitimate users rarely execute multiple transactions in under an hour. Rapid successive usage suggests card-sharing or automated checkout attempts.

#### Rule 6: Burst Activity (`flag_burst`)
* **Weight:** `2.5`
* **Criteria:** Cardholder registers **4 or more transactions in the past 15 minutes**.
* **Rationale:** Known as a "burst event," this pattern is highly indicative of scripted botnets or "card sweepers" draining funds as fast as possible before fraud mitigation locks the account.

---

### 3. Network & Device Linkages

These rules look across the entire network data pool to catch multi-accounting, device farms, and compromised IP subnets.

#### Rule 7: Device Reuse (`flag_device_multi`)
* **Weight:** `2.0`
* **Criteria:** The hardware `device_id` utilized for the transaction has been associated with **multiple unique cards** in the dataset.
* **Rationale:** A single user device transacting on behalf of several cards suggests a centralized fraudulent actor or a "device farm" executing coordinated attacks.

#### Rule 8: Shared IP Network (`flag_ip_multi`)
* **Weight:** `1.5`
* **Criteria:** The transaction's `ip_address` has been associated with **multiple unique cards** in the dataset.
* **Rationale:** Multiple distinct payment cards transacting from the same IP address is common for proxy networks, public VPN nodes, and botnet infection centers.

#### Rule 9: High Merchant Diversity (`flag_many_merchants`)
* **Weight:** `0.5`
* **Criteria:** The card transacts at a greater variety of merchants than the **75th percentile** threshold of the dataset baseline.
* **Rationale:** Fraudulent actors often distribute charges across dozens of different merchants to bypass merchant-specific velocity blocklists and prevent detection.

---

### 4. Spree & Category Anomalies

These rules track localized sprees in high-risk merchant categories where goods are easily resellable.

#### Rule 10: High-Risk Category (`flag_high_risk_cat`)
* **Weight:** `1.0`
* **Criteria:** The transaction merchant category is classified as **electronics, gift_card, or travel**.
* **Rationale:** High-value consumer electronics, virtual gift cards, and airline tickets are extremely easy to liquidate on secondary black markets, making them primary targets for fraudsters.

#### Rule 11: Gift Card Spree (`gift_card_spree`)
* **Weight:** `2.5`
* **Criteria:** The card is used for **2 or more gift_card purchases within a 24-hour window**.
* **Rationale:** Virtual gift cards can be delivered instantly via email and converted to cash or goods immediately. Rapid consecutive purchases are almost exclusively fraud.

#### Rule 12: Electronics Spree (`electronics_spree`)
* **Weight:** `2.0`
* **Criteria:** The card is used for **2 or more electronics purchases within a 24-hour window**.
* **Rationale:** Similar to gift cards, high-end electronics (smartphones, gaming consoles) have high resale liquidity and are purchased in rapid succession when a card is compromised.

---

### 5. Contextual & Chronological Patterns

These rules evaluate the temporal, geographic, and sequencing patterns of the transactions.

#### Rule 13: Off-Hours/Night Activity (`flag_night_tx`)
* **Weight:** `0.5`
* **Criteria:** The transaction occurs between **00:00 and 05:59 local time**.
* **Rationale:** Transactions occurring in the middle of the night deviate from typical human schedules and often match automated scripts running in different timezones.

#### Rule 14: Cross-Border Transaction (`flag_cross_border`)
* **Weight:** `0.5`
* **Criteria:** The country of the cardholder (`cardholder_country`) differs from the country of the merchant (`merchant_country`).
* **Rationale:** International payments are statistically more prone to chargebacks. Coordinated carding fraud frequently routes purchases through offshore merchants to exploit processing loopholes.

#### Rule 15: Card-Testing Sequence (`is_test_charge_pattern`)
* **Weight:** `2.0`
* **Criteria:** A transaction sequence where the cardholder's previous transaction was **less than $5.00** (a test charge) and the current transaction is **greater than $150.00** (the cashout sweep).
* **Rationale:** Fraudsters check if a card is active by making a tiny, inconspicuous "probe" purchase (often on automated donation forms). Once the test charge is approved, they immediately follow up with a high-value purchase.

---

## Summary Matrix

| # | Rule Key | Description | Category | Weight | Risk Level |
|---|---|---|---|:---:|:---:|
| 1 | `flag_high_amount` | Amount exceeds $500.00 | Amount | `1.0` | Medium |
| 2 | `flag_amount_zscore` | Amount $Z$-score > 3 | Amount | `1.0` | Medium |
| 3 | `flag_extreme_zscore` | Amount $Z$-score > 5 | Amount | `1.5` | High |
| 4 | `flag_round_amount` | Amount is divisible by 10 | Amount | `0.3` | Low |
| 5 | `flag_high_velocity` | $\ge 3$ transactions in 1 hour | Velocity | `1.5` | High |
| 6 | `flag_burst` | $\ge 4$ transactions in 15 minutes | Velocity | `2.5` | Critical |
| 7 | `flag_device_multi` | Device linked to multiple cards | Network Linkage | `2.0` | High |
| 8 | `flag_ip_multi` | IP address linked to multiple cards | Network Linkage | `1.5` | High |
| 9 | `flag_many_merchants` | Unusually high merchant diversity | Network Linkage | `0.5` | Low |
| 10 | `flag_high_risk_cat` | Merchant category is high-risk | Spree / Category | `1.0` | Medium |
| 11 | `gift_card_spree` | $\ge 2$ gift card purchases in 24 hours | Spree / Category | `2.5` | Critical |
| 12 | `electronics_spree` | $\ge 2$ electronics purchases in 24 hours | Spree / Category | `2.0` | High |
| 13 | `flag_night_tx` | Transaction time is 00:00 - 05:59 | Contextual | `0.5` | Low |
| 14 | `flag_cross_border` | Cardholder country $\neq$ Merchant country | Contextual | `0.5` | Low |
| 15 | `is_test_charge_pattern` | Test charge ($<\$5$) followed by cashout ($>\$150$) | Contextual | `2.0` | High |
