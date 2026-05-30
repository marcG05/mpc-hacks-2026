import { Injectable, InternalServerErrorException } from '@nestjs/common';
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
      const client = new net.Socket();
      
      // Connect to the Python engine server
      client.connect(3001, '127.0.0.1', () => {
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
              // Store transactions in memory for retrieval
              this.transactions = resultJson.rows;
              resolve(resultJson.rows);
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
        reject(new InternalServerErrorException('Failed to connect to Python engine'));
      });
      
      client.on('close', () => {
        // If closed before completing the request, reject if we haven't already resolved
        if (expectedLength === -1 || responseData.length < 4 + expectedLength) {
            reject(new InternalServerErrorException('TCP Connection closed unexpectedly'));
        }
      });
    });
  }

  getTransactions() {
    return this.transactions;
  }

  getDecisions() {
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
      
      client.connect(3001, '127.0.0.1', () => {
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
