import type { Transaction, LogEntry, ByTypeData } from '../types';

// Signal catalog — each detector signal with weight + icon key
export const SIGNAL_DEFS: Record<string, any> = {
  amount_zscore:   { name: "Amount anomaly",        weight: 0.25, icon: "trend",   color: "high" },
  new_device:      { name: "Unrecognized device",   weight: 0.20, icon: "device",  color: "critical" },
  ip_reuse:        { name: "Shared IP address",      weight: 0.20, icon: "network", color: "critical" },
  device_reuse:    { name: "Device reuse",           weight: 0.18, icon: "device",  color: "critical" },
  new_category:    { name: "New merchant category",  weight: 0.15, icon: "tag",     color: "medium" },
  country_mismatch:{ name: "Geographic mismatch",    weight: 0.15, icon: "globe",   color: "high" },
  velocity_1h:     { name: "Velocity spike",         weight: 0.15, icon: "bolt",    color: "high" },
  card_testing:    { name: "Card-testing pattern",   weight: 0.20, icon: "probe",   color: "critical" },
  unusual_hour:    { name: "Off-hours activity",     weight: 0.10, icon: "clock",   color: "medium" },
  new_channel:     { name: "Channel change",         weight: 0.10, icon: "swap",    color: "medium" },
};


export const FRAUD_TYPES: Record<string, string> = {
  ato:        "Account Takeover",
  test:       "Card Testing",
  cnp:        "Card-Not-Present",
  velo:       "Velocity Abuse",
  geo:        "Geo Anomaly",
  farm:       "Device Farm",
  fraud:      "Fraud",
  suspicious: "Suspicious",
  legitimate: "Legitimate",
  unknown:    "Unknown",
};

// Pre-decided audit log seed
export const LOG_SEED: LogEntry[] = [
  { time: "14:32:01", tx: "tx_000118", card: "card_0042", action: "escalate", score: 0.93, by: "L. Matkovski" },
  { time: "14:31:44", tx: "tx_000077", card: "card_0512", action: "clear",    score: 0.39, by: "L. Matkovski" },
  { time: "14:31:20", tx: "tx_000260", card: "card_0188", action: "block",    score: 0.81, by: "L. Matkovski" },
  { time: "14:29:05", tx: "tx_000341", card: "card_0033", action: "false_positive", score: 0.55, by: "A. Sharma" },
];

// Donut data
export const BY_TYPE: ByTypeData[] = [
  { label: "Account Takeover", value: 18, color: "#f0616d" },
  { label: "Card Testing",     value: 14, color: "#e98a45" },
  { label: "Geo Anomaly",      value: 12, color: "#e3bd4e" },
  { label: "Card-Not-Present", value: 16, color: "#4d8bf0" },
  { label: "Device Farm",      value: 8,  color: "#a78bfa" },
  { label: "Velocity Abuse",   value: 5,  color: "#38c08a" },
];

export const FRAUD = {
  SIGNAL_DEFS,
  FRAUD_TYPES,
  LOG_SEED,
  BY_TYPE,
  sevOf(score: number): string {
    if (score >= 0.8) return "critical";
    if (score >= 0.6) return "high";
    if (score >= 0.45) return "medium";
    return "low";
  },
  sevLabel(score: number): string {
    if (score >= 0.8) return "Critical";
    if (score >= 0.6) return "High";
    if (score >= 0.45) return "Medium";
    return "Low";
  },
  money(n: number): string {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
};
