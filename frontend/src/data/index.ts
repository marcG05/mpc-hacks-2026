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

function sig(key: string, detail: string) {
  return { key, detail, ...SIGNAL_DEFS[key] };
}

// sparkline helper — generate a believable spend history with one spike at the end
function hist(base: number, spikeMult: number): number[] {
  const arr: number[] = [];
  for (let i = 0; i < 22; i++) {
    arr.push(Math.max(4, Math.round(base * (0.5 + Math.random()))));
  }
  arr.push(Math.round(base * spikeMult)); // the flagged txn
  return arr;
}

export const FRAUD_TYPES: Record<string, string> = {
  ato:    "Account Takeover",
  test:   "Card Testing",
  cnp:    "Card-Not-Present",
  velo:   "Velocity Abuse",
  geo:    "Geo Anomaly",
  farm:   "Device Farm",
};

// Build the flagged-transaction list
export const TX: Transaction[] = [
  {
    id: "tx_000412", card: "card_0231", amount: 847.00, merchant: "Amazon.ca",
    category: "online_retail", channel: "Online", customer: "M. Petrov",
    country: "United States", merchantCountry: "Canada", device: "dev_9f1a (new)",
    ip: "203.0.113.42", time: "2026-05-30 02:14:09", score: 0.91, type: "ato",
    status: "flagged", cardMedian: 60, history: hist(60, 14.1),
    signals: [
      sig("new_device", "Device dev_9f1a has never been seen on card_0231 across 30 days of history."),
      sig("ip_reuse", "IP 203.0.113.42 was used by 4 other cards in the past hour."),
      sig("amount_zscore", "$847 is 14.1× the card's median spend of $60 (z = 4.8σ)."),
      sig("new_category", "online_retail is a category never previously used by this card."),
    ],
  },
  {
    id: "tx_000089", card: "card_0712", amount: 12.40, merchant: "QuickPay Test",
    category: "digital_goods", channel: "Online", customer: "R. Okafor",
    country: "United Kingdom", merchantCountry: "United Kingdom", device: "dev_22c8",
    ip: "198.51.100.7", time: "2026-05-30 01:58:22", score: 0.88, type: "test",
    status: "flagged", cardMedian: 95, history: hist(95, 0.13),
    signals: [
      sig("card_testing", "Five sub-$15 authorizations in 90 seconds — classic card-testing probe sequence."),
      sig("velocity_1h", "9 transactions from this card in the last hour vs. baseline of 1.2/hr."),
      sig("ip_reuse", "IP 198.51.100.7 linked to 11 distinct cards today."),
    ],
  },
  {
    id: "tx_000234", card: "card_0155", amount: 2310.00, merchant: "LuxWatchHaus",
    category: "jewelry", channel: "Online", customer: "S. Lindqvist",
    country: "Sweden", merchantCountry: "Hong Kong", device: "dev_71b0 (new)",
    ip: "192.0.2.88", time: "2026-05-30 03:41:55", score: 0.84, type: "geo",
    status: "review", cardMedian: 180, history: hist(180, 12.8),
    signals: [
      sig("country_mismatch", "Cardholder in Sweden; merchant settled in Hong Kong — 8,200 km apart."),
      sig("amount_zscore", "$2,310 is 12.8× the card's median spend of $180."),
      sig("new_device", "First-ever appearance of device dev_71b0 on this card."),
      sig("unusual_hour", "03:41 local — outside the card's usual 08:00–22:00 window."),
    ],
  },
  {
    id: "tx_000556", card: "card_0998", amount: 540.00, merchant: "GameKeys Vault",
    category: "digital_goods", channel: "Online", customer: "T. Nguyen",
    country: "Australia", merchantCountry: "Malta", device: "dev_4d2e",
    ip: "203.0.113.99", time: "2026-05-30 00:22:14", score: 0.79, type: "cnp",
    status: "flagged", cardMedian: 75, history: hist(75, 7.2),
    signals: [
      sig("new_category", "digital_goods never used by this card in 30 days."),
      sig("country_mismatch", "Cardholder AU, merchant MT."),
      sig("amount_zscore", "$540 is 7.2× the card's median of $75."),
    ],
  },
  {
    id: "tx_000301", card: "card_0231", amount: 99.00, merchant: "RideShare Plus",
    category: "transport", channel: "Online", customer: "M. Petrov",
    country: "United States", merchantCountry: "United States", device: "dev_9f1a (new)",
    ip: "203.0.113.42", time: "2026-05-30 02:09:41", score: 0.76, type: "ato",
    status: "flagged", cardMedian: 60, history: hist(60, 1.65),
    signals: [
      sig("new_device", "Same new device dev_9f1a as tx_000412 — appeared 5 min earlier."),
      sig("ip_reuse", "Shared IP 203.0.113.42 (4 cards / 1 hr)."),
      sig("velocity_1h", "3 txns on this card in 6 minutes."),
    ],
  },
  {
    id: "tx_000877", card: "card_0440", amount: 1875.50, merchant: "ElectroMart",
    category: "electronics", channel: "In-person", customer: "D. Haas",
    country: "Germany", merchantCountry: "Germany", device: "pos_terminal",
    ip: "—", time: "2026-05-29 23:51:03", score: 0.72, type: "velo",
    status: "review", cardMedian: 210, history: hist(210, 8.9),
    signals: [
      sig("amount_zscore", "$1,875 is 8.9× the card's median of $210."),
      sig("velocity_1h", "4 in-person taps across 3 stores in 40 minutes."),
      sig("unusual_hour", "23:51 — first late-night activity recorded on this card."),
    ],
  },
  {
    id: "tx_000145", card: "card_0712", amount: 14.10, merchant: "QuickPay Test",
    category: "digital_goods", channel: "Online", customer: "R. Okafor",
    country: "United Kingdom", merchantCountry: "United Kingdom", device: "dev_22c8",
    ip: "198.51.100.7", time: "2026-05-30 01:57:48", score: 0.71, type: "test",
    status: "flagged", cardMedian: 95, history: hist(95, 0.15),
    signals: [
      sig("card_testing", "Part of a rapid micro-charge burst on card_0712."),
      sig("ip_reuse", "IP linked to 11 cards today."),
    ],
  },
  {
    id: "tx_000623", card: "card_0307", amount: 320.00, merchant: "CryptoTopUp",
    category: "crypto", channel: "Online", customer: "L. Romano",
    country: "Italy", merchantCountry: "Estonia", device: "dev_88fa (new)",
    ip: "192.0.2.150", time: "2026-05-30 04:12:30", score: 0.69, type: "cnp",
    status: "flagged", cardMedian: 110, history: hist(110, 2.9),
    signals: [
      sig("new_category", "crypto never used on this card."),
      sig("country_mismatch", "Cardholder IT, merchant EE."),
      sig("unusual_hour", "04:12 local time."),
    ],
  },
  {
    id: "tx_000910", card: "card_0521", amount: 68.00, merchant: "StreamBox",
    category: "subscription", channel: "Online", customer: "A. Kowalski",
    country: "Poland", merchantCountry: "Ireland", device: "dev_12ab",
    ip: "198.51.100.61", time: "2026-05-30 05:03:19", score: 0.63, type: "farm",
    status: "review", cardMedian: 40, history: hist(40, 1.7),
    signals: [
      sig("device_reuse", "Device dev_12ab is shared across 6 different cards."),
      sig("ip_reuse", "IP used by 5 cards in 2 hours."),
    ],
  },
  {
    id: "tx_000204", card: "card_0884", amount: 410.00, merchant: "TravelFast",
    category: "travel", channel: "Online", customer: "B. Costa",
    country: "Portugal", merchantCountry: "Thailand", device: "dev_55cd",
    ip: "203.0.113.7", time: "2026-05-30 06:40:11", score: 0.58, type: "geo",
    status: "flagged", cardMedian: 130, history: hist(130, 3.2),
    signals: [
      sig("country_mismatch", "Cardholder PT, merchant TH."),
      sig("amount_zscore", "$410 is 3.2× the card median."),
    ],
  },
  {
    id: "tx_000718", card: "card_0612", amount: 27.99, merchant: "AppStore",
    category: "digital_goods", channel: "Online", customer: "K. Müller",
    country: "Germany", merchantCountry: "United States", device: "dev_77ee",
    ip: "198.51.100.20", time: "2026-05-30 07:18:02", score: 0.54, type: "velo",
    status: "flagged", cardMedian: 35, history: hist(35, 0.8),
    signals: [
      sig("velocity_1h", "6 app-store charges in 12 minutes."),
      sig("new_channel", "Card normally in-person; first online use."),
    ],
  },
  {
    id: "tx_000390", card: "card_0199", amount: 156.00, merchant: "MegaGrocer",
    category: "grocery", channel: "In-person", customer: "F. Dubois",
    country: "France", merchantCountry: "France", device: "pos_terminal",
    ip: "—", time: "2026-05-30 08:05:44", score: 0.49, type: "velo",
    status: "flagged", cardMedian: 90, history: hist(90, 1.7),
    signals: [
      sig("amount_zscore", "$156 is 1.7× the card median — mild anomaly."),
      sig("unusual_hour", "08:05 — slightly earlier than usual."),
    ],
  },
  {
    id: "tx_000462", card: "card_0521", amount: 72.00, merchant: "StreamBox",
    category: "subscription", channel: "Online", customer: "A. Kowalski",
    country: "Poland", merchantCountry: "Ireland", device: "dev_12ab",
    ip: "198.51.100.61", time: "2026-05-30 05:02:50", score: 0.46, type: "farm",
    status: "review", cardMedian: 40, history: hist(40, 1.8),
    signals: [
      sig("device_reuse", "Shared device dev_12ab (6 cards)."),
    ],
  },
  {
    id: "tx_000533", card: "card_0760", amount: 233.00, merchant: "BookWorld",
    category: "retail", channel: "Online", customer: "G. Ivanov",
    country: "Bulgaria", merchantCountry: "United Kingdom", device: "dev_90df",
    ip: "203.0.113.180", time: "2026-05-30 09:31:27", score: 0.42, type: "cnp",
    status: "flagged", cardMedian: 120, history: hist(120, 1.9),
    signals: [
      sig("country_mismatch", "Cardholder BG, merchant UK."),
    ],
  },
];

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
  TX,
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
