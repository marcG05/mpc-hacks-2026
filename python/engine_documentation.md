ENGINE.PY DOCUMENTATION

Purpose
This file documents every function in python/engine.py, the engineered
features, the rule-based score weights, and the standard classification
metrics used to evaluate fraud predictions.

1. FUNCTION-BY-FUNCTION GUIDE

1) load_data(source)
   Purpose:
   - Accepts a NumPy array with a header row, a CSV file path, or a pandas
     DataFrame.
   - Converts amount to numeric and timestamp to datetime.
   - Drops rows with invalid amount or timestamp values.
   Output:
   - A cleaned DataFrame ready for feature engineering.

2) engineer_features(df)
   Purpose:
   - Sorts data by card_id and timestamp.
   - Adds behavioral, temporal, and merchant-risk features. --- what are behavioral, temporal and merchant-risk
   Output:
   - The same DataFrame plus the engineered feature columns.

3) score_rules(df)
   Purpose:
   - Creates binary fraud flags.
   - Adds weighted points from each flag to rule_score. -- what are these weights based on 
   - Builds a readable triggers string for each transaction.
   Output:
   - The DataFrame with rule_score and triggers.

4) score_anomaly(df)
   Purpose:
   - Runs Isolation Forest on selected behavioral features. --how are those forest built? 
   - Produces raw anomaly scores, a binary anomaly label, and a normalized
     anomaly score. -- how does it do it ? 
   Output:
   - The DataFrame with if_score, if_anomaly, and if_score_norm.

5) ensemble_verdict(df)
   Purpose:
   - Normalizes rule_score.
   - Blends rule_score_norm and if_score_norm into fraud_score.
   - Converts fraud_score into LEGITIMATE, SUSPICIOUS, or FRAUD.
   Output:
   - The DataFrame with fraud_score and fraud_verdict.

6) print_report(df)
   Purpose:
   - Prints counts for each verdict.
   - Prints the top FRAUD transactions and their trigger reasons.

7) run_pipeline(source)
   Purpose:
   - Runs load_data -> engineer_features -> score_rules -> score_anomaly ->
     ensemble_verdict -> print_report.
   Output:
   - Final scored DataFrame.

2. FEATURES CREATED BY engineer_features(df)

Time features
- hour: hour of day from timestamp.
- day_of_week: 0 = Monday, 6 = Sunday.
- is_night: 1 when hour is between 00:00 and 05:59.
- is_weekend: 1 when day_of_week is Saturday or Sunday.

Per-card statistical features
- card_mean_amount: average amount for the card.
- card_std_amount: standard deviation of the card's amounts.
- card_tx_count: number of transactions for the card.
- amount_zscore: how far the amount is from the card average, measured in
  standard deviations.

Velocity features
- velocity_1h: number of prior transactions on the same card in the last hour.
- velocity_burst: number of prior transactions on the same card in the last
  15 minutes.

Risk and linkage features
- cross_border: 1 when cardholder_country != merchant_country.
- high_risk_category: 1 for electronics, gift_card, or travel.
- device_multi_card: 1 when a device is linked to more than one card.
- ip_multi_card: 1 when an IP is linked to more than one card. --would it be possible to detect timezone or locations of transactions from the ips aswell ? 
- many_merchants: 1 when the card transacts at more merchants than the
  dataset's 75th percentile threshold.

Pattern features
- flag_round_amount: 1 when amount is divisible by 10. --why 
- is_gift_card_txn: 1 when the merchant category is gift_card.
- gift_card_spree: 1 when the card has at least 2 gift-card purchases in 24h.
- prev_amount: previous transaction amount for the same card.
- is_test_charge_pattern: 1 when the previous amount is below 5 and the
  current amount is above 150.
- is_electronics_txn: 1 when the merchant category is electronics.
- electronics_spree: 1 when the card has at least 2 electronics purchases in
  24h.

3. RULE SCORE WEIGHTS

score_rules(df) assigns this weight to each active flag:
- flag_amount_zscore: 1.0
- flag_extreme_zscore: 1.5
- flag_high_amount: 1.0
- flag_night_tx: 0.5
- flag_cross_border: 0.5
- flag_high_risk_cat: 1.0
- flag_high_velocity: 1.5
- flag_burst: 2.5
- gift_card_spree: 2.5
- electronics_spree: 2.0
- flag_round_amount: 0.3
- flag_many_merchants: 0.5
- flag_device_multi: 2.0
- flag_ip_multi: 1.5
- is_test_charge_pattern: 2.0

Key rule meanings
- flag_high_amount: amount > 500
- flag_amount_zscore: amount_zscore > 3
- flag_extreme_zscore: amount_zscore > 5
- flag_night_tx: transaction happened during 00:00-05:59
- flag_cross_border: cardholder and merchant countries differ
- flag_high_velocity: 3 or more prior transactions in the past hour
- flag_burst: 4 or more prior transactions in the past 15 minutes
- gift_card_spree: at least 2 gift-card purchases in 24 hours
- electronics_spree: at least 2 electronics purchases in 24 hours
- flag_round_amount: amount ends in 0
- flag_many_merchants: unusually large merchant diversity for the card
- flag_device_multi: device shared by multiple cards
- flag_ip_multi: IP shared by multiple cards
- is_test_charge_pattern: small test charge followed by a large charge

4. SCORE AND VERDICT FORMULAS

Rule normalization
- rule_score_norm = rule_score / max(rule_score)
- If max(rule_score) is 0, rule_score_norm = 0

Isolation Forest normalization
- if_score is the raw output of IsolationForest.score_samples()
- More negative raw scores mean more anomalous
- if_score_norm = 1 - (raw_score - min_score) / (max_score - min_score)
- If all raw scores are equal, if_score_norm = 0

Final fraud score
- fraud_score = 0.6 * rule_score_norm + 0.4 * if_score_norm

Verdict cutoffs
- fraud_score <= 0.30: LEGITIMATE
- 0.30 < fraud_score <= 0.50: SUSPICIOUS
- fraud_score > 0.50: FRAUD

5. HOW RECALL, ACCURACY, AND F1 ARE CALCULATED

These metrics require a labeled evaluation set.

Definitions
- TP: true positives = frauds correctly predicted as fraud
- TN: true negatives = legitimate transactions correctly predicted as
  legitimate
- FP: false positives = legitimate transactions predicted as fraud
- FN: false negatives = fraud transactions predicted as legitimate

Accuracy
- Accuracy = (TP + TN) / (TP + TN + FP + FN)
- This measures overall correctness.

Recall
- Recall = TP / (TP + FN)
- This measures how many actual fraud cases were found.

Precision
- Precision = TP / (TP + FP)
- This measures how many predicted fraud cases were correct.

F1 score
- F1 = 2 * (Precision * Recall) / (Precision + Recall)
- F1 is the harmonic mean of precision and recall.

Important note
- The current engine outputs LEGITIMATE, SUSPICIOUS, and FRAUD.
- For binary metrics, choose a positive class before scoring.
  Common choice: treat FRAUD as positive and LEGITIMATE as negative.
  If SUSPICIOUS should count as positive, include it in the positive class
  before calculating the metrics.

6. MAIN SCRIPT BEHAVIOR

When python/engine.py runs as a script:
- It loads transactions.csv from the same directory.
- It executes the full pipeline.
- It saves fraud_results.csv with the scored rows.
