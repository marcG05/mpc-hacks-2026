import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, OnModuleInit } from '@nestjs/common';
import * as net from 'net';
import * as sqlite3 from 'sqlite3';
import * as path from 'path';

@Injectable()
export class EngineService implements OnModuleInit {
  private transactions: any[] = [];
  private decisions: any[] = [];
  private metrics: any = { available: false };
  private db: sqlite3.Database;

  onModuleInit() {
    const dbPath = path.join(process.cwd(), 'data.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
      } else {
        console.log('Connected to SQLite database at:', dbPath);
        this.initDatabase();
      }
    });
  }

  private initDatabase() {
    this.db.serialize(() => {
      // 1. Decisions table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS decisions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          time TEXT,
          tx TEXT,
          card TEXT,
          action TEXT,
          score REAL,
          by TEXT
        )
      `);

      // 2. Users table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE,
          password TEXT
        )
      `, () => {
        // Seed user Marc / 1234
        this.db.run(
          `INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
          ['Marc', '1234']
        );
      });

      // 3. Departments table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE
        )
      `, () => {
        // Seed departments
        const depts = [
          'Payments Compliance',
          'Chargeback Operations',
          'Identity Verification Desk',
          'Security Engineering'
        ];
        depts.forEach((d) => {
          this.db.run(`INSERT OR IGNORE INTO departments (name) VALUES (?)`, [d]);
        });
      });
    });
  }

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
                    let name = 'Risk Trigger';
                    let icon = 'flag';
                    let color = 'high';
                    
                    if (p.includes('Amount')) { name = 'Amount Anomaly'; icon = 'trend'; color = 'critical'; }
                    else if (p.includes('Cross-border')) { name = 'Geographic Mismatch'; icon = 'globe'; }
                    else if (p.includes('other txns') || p.includes('Burst') || p.includes('Velocity')) { name = 'Velocity Spike'; icon = 'bolt'; color = 'critical'; }
                    else if (p.includes('High-risk category')) { name = 'High-risk Category'; icon = 'tag'; }
                    else if (p.includes('spree')) { name = 'Targeted Spree'; icon = 'shopping-bag'; color = 'critical'; }
                    else if (p.includes('Device')) { name = 'Device Reuse'; icon = 'device'; color = 'critical'; }
                    else if (p.includes('IP ')) { name = 'Shared IP Address'; icon = 'network'; color = 'critical'; }
                    else if (p.includes('Test-charge') || p.includes('Round amount') || p.includes('merchants')) { name = 'Card-Testing Pattern'; icon = 'probe'; color = 'critical'; }
                    else if (p.includes('night window') || p.includes('unusual_hour')) { name = 'Off-hours Activity'; icon = 'clock'; }

                    signals.push({ key: `sig-${i}`, name, detail: p, weight: 1, color, icon });
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

              if (resultJson.metrics) {
                this.metrics = { available: true, ...resultJson.metrics };
              } else {
                this.metrics = { available: false };
              }

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

  async getDecisions(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM decisions ORDER BY id DESC', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getSummary() {
    const dbDecisionsCount = await new Promise<number>((resolve) => {
      this.db.get('SELECT COUNT(*) as count FROM decisions', [], (err, row) => {
        resolve(row ? (row as any).count : 0);
      });
    });

    return {
      totalTransactions: this.transactions.length,
      totalDecisions: dbDecisionsCount,
      atRisk: this.transactions.filter(t => t.status === 'flagged' || t.status === 'review').reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }

  getMetrics() {
    return this.metrics ?? { available: false };
  }

  async recordDecision(decision: any): Promise<any> {
    const entry = {
      ...decision,
      time: decision.time || new Date().toISOString(),
    };
    this.decisions.unshift(entry);

    // Save to SQLite database
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO decisions (time, tx, card, action, score, by) VALUES (?, ?, ?, ?, ?, ?)`,
        [entry.time, entry.tx, entry.card, entry.action, entry.score || 0, entry.by || ''],
        (err) => {
          if (err) {
            console.error('Error inserting decision into SQLite:', err);
            reject(err);
          } else {
            // Update the local transaction status if it exists
            const txIndex = this.transactions.findIndex(t => t.id === decision.tx);
            if (txIndex !== -1) {
              const statusMap: Record<string, string> = { block: "blocked", clear: "cleared", escalate: "escalated", false_positive: "false_positive" };
              this.transactions[txIndex].status = statusMap[decision.action] || decision.action;
            }
            resolve({ ok: true, decision: entry });
          }
        }
      );
    });
  }

  async login(username: string, password: string): Promise<{ ok: boolean; user?: { username: string }; error?: string }> {
    return new Promise((resolve) => {
      this.db.get(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, row) => {
          if (err) {
            resolve({ ok: false, error: 'Database error' });
          } else if (row) {
            resolve({ ok: true, user: { username: (row as any).username } });
          } else {
            resolve({ ok: false, error: 'Invalid credentials' });
          }
        }
      );
    });
  }

  async getDepartments(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT name FROM departments', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map((r: any) => r.name));
        }
      });
    });
  }

  async getUsers(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT username FROM users', [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows.map((r: any) => r.username));
        }
      });
    });
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

  async chatWithGemini(
    tx: any,
    history: any[],
    message: string,
  ): Promise<{ response: string }> {
    const key = process.env.gemapikey || '';
    if (!key) {
      return { response: "Warning: Gemini API Key ('gemapikey') is not configured in backend environment." };
    }

    const systemPrompt = `You are Fraud Hunter Copilot, an expert fraud operations assistant.
You are helping Lucas triage transaction ${tx.id}.
Here is the transaction metadata:
- ID: ${tx.id}
- Card: ${tx.card}
- Amount: $${tx.amount} (Median spend on card: $${tx.cardMedian})
- Merchant: ${tx.merchant} (${tx.category})
- Location: Cardholder country ${tx.country} vs Merchant country ${tx.merchantCountry}
- Device: ${tx.device || 'N/A'}, IP: ${tx.ip || 'N/A'}
- Time: ${tx.time}
- Risk Score: ${(tx.score * 100).toFixed(0)}%
- Triggered Signals:
${tx.signals.map((s: any) => `  * ${s.name} (+${s.weight}): ${s.detail}`).join('\n')}

Guidelines:
1. Keep your answers relatively short, diagnostic, and direct.
2. If the user asks about location, maps, card history, device/IP, or signals, briefly analyze it and explicitly instruct the user to view the corresponding tab in the right-hand panel (e.g. "I have loaded the map on the right. You can see the geographic route...", "Open the Card History panel to see cardholder baselines").
3. DO NOT output long bulleted lists of transaction metadata. The analyst can see the card, amount, merchant, and signals on screen. Focus on analyzing the correlations.
4. Give a clear decision recommendation: Approve, Block & Escalate, or Hold for Verification.
5. Use markdown formatting (bold, italic, list items).`;

    const contents: any[] = [];

    // 1. Push system prompt as the first user message
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    });

    let lastRole = 'user';

    const mapRole = (roleStr: string) => {
      const lr = (roleStr || '').toLowerCase();
      if (lr === 'me' || lr === 'user') return 'user';
      return 'model';
    };

    // Append history, ensuring alternating roles
    if (Array.isArray(history)) {
      history.forEach((h: any) => {
        const currentRole = mapRole(h.role);
        if (currentRole !== lastRole) {
          contents.push({
            role: currentRole,
            parts: [{ text: h.text }]
          });
          lastRole = currentRole;
        } else {
          // If role is duplicate, append text to avoid Gemini API error
          const lastContent = contents[contents.length - 1];
          if (lastContent && lastContent.parts && lastContent.parts.length > 0) {
            lastContent.parts[0].text += '\n\n' + h.text;
          }
        }
      });
    }

    // Append new message
    const nextRole = 'user';
    if (nextRole !== lastRole) {
      contents.push({
        role: nextRole,
        parts: [{ text: message }]
      });
    } else {
      const lastContent = contents[contents.length - 1];
      if (lastContent && lastContent.parts && lastContent.parts.length > 0) {
        lastContent.parts[0].text += '\n\n' + message;
      }
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
      const gFetch = (global as any).fetch;
      const response = await gFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errText}`);
      }

      const resData = await response.json();
      const replyText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return { response: replyText };
    } catch (e) {
      console.error('Gemini API failed:', e);
      return { response: `Error generating response: ${e.message}` };
    }
  }
}
