# Product Requirements Document (PRD): Falcon Fraud & Anomaly Triage Platform

## 1. Executive Summary
**Falcon** is a real-time, hybrid fraud detection and operations platform designed to help financial services platforms and merchant acquirers evaluate, monitor, and triage high-risk transaction streams. The platform blends a rule-based compliance engine (60% weight) with an unsupervised Isolation Forest machine learning model (40% weight) to score incoming transaction files, providing fraud analysts with an interactive interface to make decisions, configure risk thresholds, and inspect anomalies using GenAI-assisted diagnostics.

---

## 2. Who is the User?
The primary users of Falcon are **Level 1 and Level 2 Fraud Operations Analysts**, **Payments Compliance Managers**, and **Risk Engineers**.

* **L1/L2 Fraud Operations Analysts (e.g., Lucas):** Focus on fast, accurate decision-making. They review the automated "Review" queues, trace geographic/velocity markers, interact with AI summaries of transaction history, and record triage actions (Approve, Block/Escalate, Hold).
* **Payments Compliance & Risk Managers:** Responsible for auditing decisions, managing risk queues, and adjusting overall system thresholds.
* **Risk/Security Engineers:** Monitor pipeline health, configure detection rules (such as adjusting the mathematical weights of deterministic signals), and evaluate model metrics (Precision, Recall, F1, Accuracy) against labeled evaluation runs.

---

## 3. Problem Statement & User Pain Points
Current fraud management workflows are fragmented and inefficient:
1. **Tool Proliferation:** Analysts are forced to copy-paste IP addresses, card numbers, and transaction IDs between disjointed databases, network visualization nodes, and rule engines to investigate a single suspicious event.
2. **"Black Box" Machine Learning:** Traditional ML scores do not explain *why* a transaction was flagged, leading to alert fatigue or high false-positive rates that block legitimate customers.
3. **Rigid Configuration:** Adjusting risk rules and ML hyperparameters typically requires developer intervention, redeploying containers, or database migrations, slowing down active mitigation against evolving fraud rings.
4. **No Centralized Action Logging:** Teams lack a lightweight, audited record of *who* approved or blocked what transaction and *why*, making compliance auditing and feedback loop collection difficult.

---

## 4. What Success Looks Like (KPIs)
* **Reduced Mean Time to Resolve (MTTR):** Decreasing the average time an analyst spends triaging a flagged transaction from minutes to seconds through integrated maps, profile logs, and a GenAI-assisted chat assistant.
* **Higher Precision & Recall (Optimized F1):** Enabling risk engineers to tune detection rules via the Tuner dashboard to minimize False Positives (maximizing Precision) while catching maximum fraud (maximizing Recall).
* **Auditability:** 100% of analyst decisions (Approve, Block/Escalate, Hold) are tracked in a persistent SQLite audit log containing the timestamp, transaction/card reference, action, risk score, and analyst name.
* **Actionable Interpretability:** Every transaction score displays a breakdown of triggered rules (e.g., Velocity Spike, Test Charge Pattern, Shared IP) with exact contextual descriptions explaining the anomaly.

---

## 5. Core Product Features (Scope)

### A. Core Rule-Based & ML Detection Engine (Python)
* Evaluates transaction batches against **15 compliance, temporal, velocity, and network linkage rules** (e.g., Z-Score deviations, overnight activity, device/IP multi-card association).
* Runs an unsupervised **Isolation Forest model** on behavioral statistics.
* Normalizes and blends both scores ($0.6 \times \text{Rule} + 0.4 \times \text{ML}$) into a consolidated risk tier:
  * **Legitimate** ($\le 0.30$)
  * **Suspicious/Review** ($0.30 < \text{Score} \le 0.50$)
  * **Fraud/Flagged** ($> 0.50$)

### B. Interactive Analytics Dashboard & Triage Log (React Frontend)
* **Welcome Dashboard:** Displays high-level KPIs: total uploaded files, total resolved decisions, and dollar amounts currently "at-risk."
* **Log Grid:** Displays a search-and-filter-ready list of transaction history.
* **Investigation Drawer/Tabs:**
  * **Map Panel:** Interactive Mapbox visualization rendering route arcs between the cardholder country and merchant country to detect geographic mismatches.
  * **Signal Panel:** A breakdown of triggered signals, their weights, and descriptive context.
  * **Profile/Baselines:** Historical transaction statistics and sparklines showing deviation from average card spend.
  * **Network Panel:** Shared device and IP statistics.
  * **AI Assistant Chat:** An integrated conversational agent powered by Gemini API, loaded with transaction metadata, which can perform on-demand Wikipedia research (e.g., on Isolation Forest, PCI regulations, or VPN bypasses) to assist analysts in real-time.
* **Triage Bar:** Direct controls for analysts to execute decisions: "Clear," "Block & Escalate," and "Hold for Verification."

### C. Live Risk Rules Configuration ("Tuner" Flask App)
* Direct interface for risk engineers to fetch the running engine's parameters.
* Allows live-updating weights for any of the 15 rules, updating the ensemble blend ratio, and setting new suspicious/fraud thresholds.
* Instantly updates the Python engine in memory and saves to a persistent JSON configuration file (`config.json`).

### D. Centralized Audit API & Database (NestJS & SQLite)
* Central gateway connecting React with the Python engine and SQLite database.
* Manages database schemas for Analyst Decisions, User Credentials (seeded with default `Marc`/`1234` login), and operational departments.

---

## 6. What We Are Explicitly NOT Building (Out of Scope)
* **Real-time Gateway Blocker:** Falcon does not sit inline with payment networks to reject active authorization requests. It functions as an out-of-band upload, analysis, and triage workflow.
* **Automatic Machine Learning Retraining:** The platform does not automatically retrain the Isolation Forest model on local SQLite logs. Re-training remains an offline data-science step.
* **Integrated Multi-Factor Authentication (MFA):** No complex authentication flows, OAuth, SAML, or password-reset mechanisms are included in the MVP.
* **Dynamic Merchant Category Management:** Merchant risk categories (electronics, travel, gift card) are statically hardcoded in engine logic.
