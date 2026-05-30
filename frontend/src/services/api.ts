import type { Transaction, LogEntry } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}/engine${path}`, {
    credentials: 'include',
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function analyzeTransactions(file: File): Promise<{ transactions: Transaction[] }> {
  const form = new FormData();
  form.append('file', file);
  return request('/analyze', { method: 'POST', body: form });
}

export async function fetchTransactions(): Promise<Transaction[]> {
  return request('/transactions');
}

export async function fetchDecisions(): Promise<LogEntry[]> {
  return request('/decisions');
}

export async function recordDecision(payload: { tx: string; card: string; action: string; score: number; by: string }): Promise<LogEntry> {
  return request('/decision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchSummary(): Promise<{ total: number; fraudCount: number; suspiciousCount: number; legitimateCount: number; avgScore: number }> {
  return request('/summary');
}
