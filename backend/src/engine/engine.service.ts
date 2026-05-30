import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as net from 'net';

@Injectable()
export class EngineService {
  private transactions: any[] = [];
  private decisions: any[] = [];

  getHello(): string {
    return 'Hello World';
  }

  async processTransactions(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      if (file == null) {
        reject(new BadRequestException("File not found in the request"));
      }
      const client = new net.Socket();

      // Connect to the Python engine server
      client.connect(3001, 'engine', () => {
        const payloadLength = Buffer.alloc(4);
        payloadLength.writeUInt32BE(file.buffer.length, 0);

        // Send header + payload
        client.write(payloadLength);
        client.write(file.buffer);
      });

      let responseData = Buffer.alloc(0);
      let expectedLength = -1;

      client.on('data', (data) => {
        responseData = Buffer.concat([responseData, data]);

        // Parse the 4-byte header if we haven't already
        if (expectedLength === -1 && responseData.length >= 4) {
          expectedLength = responseData.readUInt32BE(0);
        }

        // Check if we have the full payload
        if (expectedLength !== -1 && responseData.length >= 4 + expectedLength) {
          const payload = responseData.subarray(4, 4 + expectedLength);
          const resultStr = payload.toString('utf-8');

          try {
            const resultJson = JSON.parse(resultStr);
            if (resultJson.ok) {
              const mappedRows = resultJson.rows.map((r: any) => {
                const signals: any[] = [];
                if (r.triggers) {
                  const parts = r.triggers.split(' | ');
                  parts.forEach((p: string, i: number) => {
                    signals.push({ key: `sig-${i}`, name: 'Risk Trigger', detail: p, weight: 1, color: 'high', icon: 'flag' });
                  });
                }

                let status = 'cleared';
                if (r.fraud_verdict === 'FRAUD') status = 'flagged';
                else if (r.fraud_verdict === 'SUSPICIOUS') status = 'review';

                // Fallback for timestamp formatting
                let timeStr = '12:00';
                try {
                  const d = new Date(r.timestamp);
                  if (!isNaN(d.getTime())) timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) { }

                return {
                  id: r.transaction_id || `tx-${Math.floor(Math.random() * 10000)}`,
                  card: r.card_id || 'unknown',
                  amount: r.amount || 0,
                  merchant: r.merchant_name || 'unknown',
                  category: r.merchant_category || 'unknown',
                  channel: r.channel || 'online',
                  customer: r.customer_name || 'unknown',
                  country: r.cardholder_country || 'US',
                  merchantCountry: r.merchant_country || 'US',
                  device: r.device_id || '',
                  ip: r.ip_address || '',
                  time: timeStr,
                  score: r.fraud_score || 0,
                  type: 'anomaly',
                  status: status,
                  cardMedian: r.card_mean_amount || r.amount || 0,
                  history: [r.amount * 0.8, r.amount * 1.2, r.amount * 0.5, r.amount * 1.1, r.amount, r.amount * 0.9], // Safe dummy numbers for sparkline
                  signals: signals
                };
              });

              this.transactions = mappedRows;
              resolve(mappedRows);
            } else {
              reject(new InternalServerErrorException(resultJson.error || 'Engine processing failed'));
            }
          } catch (e) {
            reject(new InternalServerErrorException('Invalid response from engine'));
          } finally {
            client.destroy();
          }
        }
      });

      client.on('error', (err) => {
        console.error("TCP Client error:", err);
        reject(new InternalServerErrorException('Failed to connect the engine'));
      });

      client.on('close', () => {
        // If closed before completing the request, reject if we haven't already resolved
        if (expectedLength === -1 || responseData.length < 4 + expectedLength) {
          reject(new InternalServerErrorException('Engine Connection closed unexpectedly'));
        }
      });
    });
  }

  getTransactions() {
    if (this.transactions.length < 1) {
      throw new NotFoundException("Transactions not found");
    }
    return this.transactions;
  }

  getDecisions() {
    if (this.decisions.length < 1) {
      throw new NotFoundException("Decisions not found");
    }
    return this.decisions;
  }

  getSummary() {
    return {
      totalTransactions: this.transactions.length,
      totalDecisions: this.decisions.length,
      atRisk: this.transactions.filter(t => t.status === 'flagged' || t.status === 'review').reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }

  recordDecision(decision: any) {
    const entry = {
      ...decision,
      time: decision.time || new Date().toISOString(),
    };
    this.decisions.unshift(entry);

    // Update the local transaction status if it exists
    const txIndex = this.transactions.findIndex(t => t.id === decision.tx);
    if (txIndex !== -1) {
      const statusMap: Record<string, string> = { block: "blocked", clear: "cleared", escalate: "escalated", false_positive: "false_positive" };
      this.transactions[txIndex].status = statusMap[decision.action] || decision.action;
    }

    return { ok: true, decision: entry };
  }

  async getHealth(): Promise<{ status: string; engine: string }> {
    return new Promise((resolve) => {
      const client = new net.Socket();

      client.connect(3001, 'engine', () => {
        const payload = Buffer.from('__ping__', 'utf8');
        const payloadLength = Buffer.alloc(4);
        payloadLength.writeUInt32BE(payload.length, 0);
        client.write(payloadLength);
        client.write(payload);
      });

      client.on('data', () => {
        resolve({ status: 'ok', engine: 'online' });
        client.destroy();
      });

      client.on('error', () => {
        resolve({ status: 'error', engine: 'offline' });
      });
    });
  }
}
