export interface Signal {
  key: string;
  name: string;
  detail: string;
  weight: number;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  card: string;
  amount: number;
  merchant: string;
  category: string;
  channel: string;
  customer: string;
  country: string;
  merchantCountry: string;
  device: string;
  ip: string;
  time: string;
  timestamp?: string;
  score: number;
  type: string;
  status: 'flagged' | 'review' | 'blocked' | 'cleared' | 'escalated' | 'false_positive';
  cardMedian: number;
  history: number[];
  signals: Signal[];
}

export interface LogEntry {
  time: string;
  tx: string;
  card: string;
  action: string;
  score: number;
  by: string;
}

export interface Metrics {
  available: boolean;
  precision?: number;
  recall?: number;
  f1?: number;
  support?: number;
  label_column?: string;
}

export interface ByTypeData {
  label: string;
  value: number;
  color: string;
}
