import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as net from 'net';

type ParsedValue = string | number | null | undefined;

interface ParsedRow {
  [key: string]: ParsedValue;
}

interface EngineTransaction {
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
  score: number;
  type: string;
  status:
    | 'flagged'
    | 'review'
    | 'blocked'
    | 'cleared'
    | 'escalated'
    | 'false_positive';
  cardMedian: number;
  history: number[];
  signals: Array<{
    key: string;
    name: string;
    detail: string;
    weight: number;
    icon: string;
    color: string;
  }>;
}

interface DecisionRecord {
  time: string;
  tx: string;
  card: string;
  action: string;
  score: number;
  by: string;
}

interface AnalysisResult {
  transactions: EngineTransaction[];
  summary: {
    total: number;
    fraudCount: number;
    suspiciousCount: number;
    legitimateCount: number;
    avgScore: number;
  };
}

interface EngineResponseOk {
  ok: true;
  rows: ParsedRow[];
}

interface EngineResponseError {
  ok: false;
  error: string;
}

type EngineResponse = EngineResponseOk | EngineResponseError;

@Injectable()
export class EngineService {
  private cachedTransactions: EngineTransaction[] = [];
  private decisionLog: DecisionRecord[] = [];
  private readonly engineHost: string;
  private readonly enginePort: number;

  constructor() {
    this.engineHost = process.env.PY_ENGINE_HOST ?? '127.0.0.1';
    const port = Number(process.env.PY_ENGINE_PORT ?? 3001);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
      throw new Error('PY_ENGINE_PORT must be a valid TCP port');
    }
    this.enginePort = port;
  }

  getHello(): string {
    return 'Hello World';
  }

  async processTransactions(
    file: Express.Multer.File,
  ): Promise<AnalysisResult> {
    try {
      const response = await this.requestEngine(file.buffer);
      if (!response.ok) {
        throw new Error(response.error);
      }

      const rows = response.rows;
      this.cachedTransactions = rows.map((row, index) =>
        this.mapRowToTransaction(row, index),
      );

      return {
        transactions: this.cachedTransactions,
        summary: this.computeSummary(this.cachedTransactions),
      };
    } catch (error) {
      console.error('Error processing transactions:', error);
      throw new InternalServerErrorException(
        'Failed to process transactions via python engine',
      );
    }
  }

  getTransactions(): EngineTransaction[] {
    return this.cachedTransactions;
  }

  getDecisions(): DecisionRecord[] {
    return this.decisionLog;
  }

  getSummary(): AnalysisResult['summary'] {
    return this.computeSummary(this.cachedTransactions);
  }

  async getHealth() {
    try {
      await this.requestEngine(Buffer.from('__ping__', 'utf-8'));
      return { ok: true, host: this.engineHost, port: this.enginePort };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        ok: false,
        host: this.engineHost,
        port: this.enginePort,
        error: message,
      };
    }
  }

  recordDecision(body: {
    tx: string;
    card?: string;
    action: string;
    score?: number;
    by?: string;
    time?: string;
  }): DecisionRecord {
    const now = new Date();
    const time =
      body.time ||
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    const record: DecisionRecord = {
      time,
      tx: body.tx,
      card: body.card || '',
      action: body.action,
      score: body.score ?? 0,
      by: body.by || 'Analyst',
    };

    const statusMap: Record<string, EngineTransaction['status']> = {
      block: 'blocked',
      clear: 'cleared',
      escalate: 'escalated',
      false_positive: 'false_positive',
    };

    const transaction = this.cachedTransactions.find((t) => t.id === body.tx);
    if (transaction) {
      transaction.status = statusMap[body.action] ?? transaction.status;
    }

    this.decisionLog.unshift(record);
    return record;
  }

  private computeSummary(
    transactions: EngineTransaction[],
  ): AnalysisResult['summary'] {
    const fraudCount = transactions.filter((t) => t.type === 'fraud').length;
    const suspiciousCount = transactions.filter(
      (t) => t.type === 'suspicious',
    ).length;
    const legitimateCount = transactions.filter(
      (t) => t.type === 'legitimate',
    ).length;
    const total = transactions.length;
    const avgScore = total
      ? transactions.reduce((sum, t) => sum + t.score, 0) / total
      : 0;
    return { total, fraudCount, suspiciousCount, legitimateCount, avgScore };
  }

  private mapRowToTransaction(
    row: ParsedRow,
    index: number,
  ): EngineTransaction {
    const amount = this.pickNumber(row, ['amount', 'Amount']);
    const verdict = this.pickString(row, [
      'fraud_verdict',
      'Fraud_verdict',
      'fraud_verdict',
    ])
      .trim()
      .toUpperCase();

    const type = verdict.toLowerCase() || 'unknown';
    const score = this.pickNumber(row, [
      'fraud_score',
      'fraud_score_norm',
      'rule_score_norm',
    ]);
    const status: EngineTransaction['status'] =
      verdict === 'FRAUD'
        ? 'flagged'
        : verdict === 'SUSPICIOUS'
          ? 'review'
          : 'cleared';

    const signals = this.parseTriggers(
      this.pickString(row, ['triggers', 'Triggers']),
    );

    return {
      id:
        this.pickString(row, ['transaction_id', 'TransactionID']) ||
        `tx_${String(index + 1).padStart(6, '0')}`,
      card: this.pickString(row, ['card_id', 'CardID', 'card']) || 'unknown',
      amount,
      merchant:
        this.pickString(row, ['merchant_name', 'MerchantName', 'merchant']) ||
        'unknown',
      category:
        this.pickString(row, [
          'merchant_category',
          'MerchantCategory',
          'category',
        ]) || 'unknown',
      channel: this.pickString(row, ['channel', 'Channel']) || 'Online',
      customer:
        this.pickString(row, [
          'cardholder_name',
          'CardholderName',
          'customer',
        ]) || 'Unknown',
      country:
        this.pickString(row, [
          'cardholder_country',
          'CardholderCountry',
          'country',
        ]) || 'Unknown',
      merchantCountry:
        this.pickString(row, [
          'merchant_country',
          'MerchantCountry',
          'merchantCountry',
        ]) || 'Unknown',
      device:
        this.pickString(row, ['device_id', 'DeviceID', 'device']) || 'unknown',
      ip: this.pickString(row, ['ip_address', 'IPAddress', 'ip']) || 'unknown',
      time:
        this.pickString(row, ['timestamp', 'Timestamp', 'time']) ||
        new Date().toISOString(),
      score,
      type,
      status,
      cardMedian: this.pickNumber(row, [
        'card_mean_amount',
        'CardMeanAmount',
        'cardMedian',
      ]),
      history: this.buildHistory(amount),
      signals,
    };
  }

  private buildHistory(amount: number): number[] {
    const base = Math.max(5, amount / 3);
    const history = Array.from({ length: 22 }, () =>
      Math.round(base * (0.45 + Math.random() * 0.9)),
    );
    history.push(Math.round(amount));
    return history;
  }

  private parseTriggers(triggers: string) {
    const parts = triggers
      .split('|')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);

    return parts.map((text, index) => ({
      key: `trigger_${index}`,
      name: text.length > 50 ? `${text.slice(0, 47)}...` : text,
      detail: text,
      weight: Math.min(0.95, Math.max(0.15, text.length / 80)),
      icon: 'flag',
      color: 'critical',
    }));
  }

  private pickValue(row: ParsedRow, keys: string[]): ParsedValue {
    for (const key of keys) {
      const value = row[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return '';
  }

  private pickString(row: ParsedRow, keys: string[]): string {
    const value = this.pickValue(row, keys);
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  }

  private pickNumber(row: ParsedRow, keys: string[]): number {
    const value = this.pickValue(row, keys);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private async requestEngine(payload: Buffer): Promise<EngineResponse> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let buffer = Buffer.alloc(0);
      let expectedLength: number | null = null;
      let completed = false;

      const cleanup = () => {
        socket.removeAllListeners();
      };

      const fail = (error: Error) => {
        if (completed) {
          return;
        }
        completed = true;
        cleanup();
        socket.destroy();
        reject(error);
      };

      socket.setTimeout(15000);
      socket.once('timeout', () =>
        fail(new Error('Timed out waiting for python engine response')),
      );
      socket.once('error', (error) => fail(error));

      socket.on('data', (chunk) => {
        if (completed) {
          return;
        }
        buffer = Buffer.concat([buffer, chunk]);
        if (expectedLength === null) {
          if (buffer.length < 4) {
            return;
          }
          expectedLength = buffer.readUInt32BE(0);
          buffer = buffer.slice(4);
        }

        if (expectedLength !== null && buffer.length >= expectedLength) {
          const body = buffer.slice(0, expectedLength).toString('utf-8');
          completed = true;
          cleanup();
          socket.end();
          try {
            resolve(this.parseEngineResponse(body));
          } catch (error) {
            reject(error as Error);
          }
        }
      });

      socket.connect(this.enginePort, this.engineHost, () => {
        const header = Buffer.alloc(4);
        header.writeUInt32BE(payload.length, 0);
        socket.write(Buffer.concat([header, payload]));
      });
    });
  }

  private parseEngineResponse(body: string): EngineResponse {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Error('Invalid JSON response from python engine');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid response from python engine');
    }

    const response = parsed as {
      ok?: unknown;
      rows?: unknown;
      error?: unknown;
    };

    if (response.ok === true) {
      if (!Array.isArray(response.rows)) {
        throw new Error('Python engine response missing rows');
      }
      return { ok: true, rows: response.rows as ParsedRow[] };
    }

    const errorMessage =
      typeof response.error === 'string'
        ? response.error
        : 'Python engine failed';
    return { ok: false, error: errorMessage };
  }
}
