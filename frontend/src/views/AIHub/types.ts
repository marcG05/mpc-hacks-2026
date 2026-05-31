export interface EscalatedReport {
  txId: string;
  amount: number;
  timestamp: string;
  notes: string;
  unableToDetermine: boolean;
  department: string;
  assignee: string;
  audioMemo?: string;
}

export type TabKey = 'amount' | 'location' | 'device' | 'card' | 'signals' | 'time';
