import type { Transaction, LogEntry, Metrics } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}/engine${path}`, {
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}

async function resolveCsvFile(input: File | string): Promise<File> {
  if (input instanceof File) {
    return input;
  }

  const response = await fetch(input);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CSV fetch failed (${response.status}): ${text}`);
  }

  const blob = await response.blob();
  const name = input.split('/').pop() || 'import.csv';
  return new File([blob], name, { type: blob.type || 'text/csv' });
}

export async function analyzeTransactions(
  file: File | string,
): Promise<{ transactions: Transaction[] }> {
  const form = new FormData();
  const csvFile = await resolveCsvFile(file);
  form.append('file', csvFile, csvFile.name);
  return request('/analyze', { method: 'POST', body: form });
}

export async function fetchTransactions(): Promise<Transaction[]> {
  return request('/transactions');
}

export async function fetchDecisions(): Promise<LogEntry[]> {
  return request('/decisions');
}

export async function fetchHealth(): Promise<{ status: string; engine: string }> {
  return request('/health');
}

export async function fetchMetrics(): Promise<Metrics> {
  return request('/metrics');
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

export async function fetchConfig(): Promise<any> {
  const response = await fetch('/tuner/api/config');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tuner config (${response.status}): ${text}`);
  }
  return response.json();
}

export async function saveConfig(config: any): Promise<any> {
  const response = await fetch('/tuner/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to save tuner config (${response.status}): ${text}`);
  }
  return response.json();
}

export async function resetConfig(): Promise<any> {
  const response = await fetch('/tuner/api/config/reset', {
    method: 'POST',
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to reset tuner config (${response.status}): ${text}`);
  }
  return response.json();
}

export async function fetchConfigDefaults(): Promise<any> {
  const response = await fetch('/tuner/api/config/defaults');
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch tuner defaults (${response.status}): ${text}`);
  }
  return response.json();
}

