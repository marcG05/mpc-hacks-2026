import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon, sigColorVar, sigBgVar } from '../../components';
import type { Transaction } from '../../types';
import { fetchChatResponse } from '../../services/api';

import { QueueSidebar } from './components/QueueSidebar';
import { ContextCard } from './components/ContextCard';
import { CopilotChat } from './components/CopilotChat';
import { EscalationModal } from './components/EscalationModal';
import { ReportViewerModal } from './components/ReportViewerModal';
import { MapboxMap } from './components/MapboxMap';
import { CurveGraph } from './components/CurveGraph';
import type { EscalatedReport, TabKey } from './types';

const COUNTRY_COORDS: Record<string, { x: number; y: number; name: string }> = {
  US: { x: 100, y: 55, name: 'United States' },
  CA: { x: 90, y: 40, name: 'Canada' },
  GB: { x: 230, y: 42, name: 'United Kingdom' },
  DE: { x: 248, y: 44, name: 'Germany' },
  FR: { x: 238, y: 48, name: 'France' },
  CN: { x: 380, y: 65, name: 'China' },
  JP: { x: 420, y: 60, name: 'Japan' },
  BR: { x: 160, y: 110, name: 'Brazil' },
  IN: { x: 335, y: 72, name: 'India' },
  RU: { x: 320, y: 40, name: 'Russia' },
  AU: { x: 420, y: 118, name: 'Australia' },
  ZA: { x: 260, y: 115, name: 'South Africa' },
  MX: { x: 110, y: 70, name: 'Mexico' },
  IT: { x: 250, y: 52, name: 'Italy' },
  ES: { x: 230, y: 54, name: 'Spain' },
  NL: { x: 242, y: 40, name: 'Netherlands' },
  SG: { x: 375, y: 88, name: 'Singapore' },
};

function getCountryCoord(code: string) {
  return COUNTRY_COORDS[code.toUpperCase()] || { x: 250, y: 70, name: code };
}

interface AIHubProps {
  txns: Transaction[];
  initialSelectedTx?: Transaction | null;
  onAction: (action: string, tx: Transaction) => void;
  currentUser?: { username: string } | null;
}

export function AIHub({ txns, initialSelectedTx, onAction, currentUser }: AIHubProps) {
  // 1. Filter queue for transactions that are flagged or in review
  const triageQueue = useMemo(() => {
    return txns.filter(t => t.status === 'flagged' || t.status === 'review');
  }, [txns]);

  // Local helper to perform action and auto-advance queue
  const handleAction = (action: string, tx: Transaction) => {
    const currentIndex = triageQueue.findIndex(t => t.id === tx.id);
    const remainingQueue = triageQueue.filter(t => t.id !== tx.id);
    let nextTx: Transaction | null = null;
    if (remainingQueue.length > 0) {
      const nextIndex = Math.min(currentIndex >= 0 ? currentIndex : 0, remainingQueue.length - 1);
      nextTx = remainingQueue[nextIndex];
    }
    onAction(action, tx);
    setSelectedTx(nextTx);
  };

  // 2. Currently selected transaction state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Sync selected transaction if it changes externally
  useEffect(() => {
    if (initialSelectedTx) {
      setSelectedTx(initialSelectedTx);
    } else if (triageQueue.length > 0 && !selectedTx) {
      setSelectedTx(triageQueue[0]);
    }
  }, [initialSelectedTx, triageQueue, selectedTx]);

  // Always keep selectedTx updated with the live status from txns array
  const activeTx = useMemo(() => {
    if (!selectedTx) return null;
    return txns.find(t => t.id === selectedTx.id) || selectedTx;
  }, [txns, selectedTx]);

  // 3. Active panel context tab state
  const [activeTab, setActiveTab] = useState<TabKey>('signals');

  // Expanded signal details card index state
  const [expandedSignalKey, setExpandedSignalKey] = useState<string | null>(null);

  // 4. Chat messaging states
  const [msgs, setMsgs] = useState<{ role: 'me' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // 5. Sidebar and Escalation Triage States
  const [sidebarTab, setSidebarTab] = useState<'queue' | 'escalated'>('queue');
  const [isEscalationFormOpen, setIsEscalationFormOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<EscalatedReport | null>(null);

  const [escalatedReports, setEscalatedReports] = useState<EscalatedReport[]>(() => {
    try {
      const saved = sessionStorage.getItem('escalated_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('escalated_reports', JSON.stringify(escalatedReports));
    } catch (e) {
      console.error(e);
    }
  }, [escalatedReports]);

  const handleConfirmEscalation = (
    notes: string,
    unableToDetermine: boolean,
    department: string,
    assignee: string,
    hasRecording: boolean
  ) => {
    if (!activeTx) return;
    
    const report: EscalatedReport = {
      txId: activeTx.id,
      amount: activeTx.amount,
      timestamp: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      notes: notes,
      unableToDetermine: unableToDetermine,
      department: department,
      assignee: assignee,
      audioMemo: hasRecording ? 'voice_memo_12s.mp3' : undefined
    };

    setEscalatedReports(prev => [report, ...prev]);
    setIsEscalationFormOpen(false);
    setSidebarTab('escalated');
    handleAction("escalate", activeTx);
  };

  const handleDownloadPDF = (report: EscalatedReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Try to find the associated transaction metadata
    const tx = txns.find(t => t.id === report.txId);
    
    const signalsHtml = tx && tx.signals && tx.signals.length > 0 
      ? tx.signals.map(s => `<li class="signal-item"><strong>${s.name}</strong>: ${s.detail}</li>`).join('')
      : '<li class="signal-item">No automated rule signals fired. Classification based on anomaly ensemble.</li>';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Escalation Case File - ${report.txId}</title>
          <style>
            @media print {
              body {
                background: #fff;
                color: #000;
                padding: 0;
              }
              .page-container {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                max-width: 100% !important;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #1a202c;
              padding: 40px;
              line-height: 1.5;
              background-color: #f7fafc;
            }
            .page-container {
              max-width: 800px;
              margin: 0 auto;
              background: #fff;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
              padding: 50px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #3182ce;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title-area h1 {
              font-size: 24px;
              font-weight: 800;
              margin: 0;
              color: #2b6cb0;
              letter-spacing: -0.02em;
            }
            .title-area p {
              font-size: 13px;
              color: #718096;
              margin: 4px 0 0 0;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .logo-placeholder {
              background: #3182ce;
              color: #fff;
              font-weight: 800;
              padding: 10px 14px;
              border-radius: 6px;
              font-size: 14px;
              text-transform: uppercase;
            }
            .section {
              margin-bottom: 30px;
            }
            .section-title {
              font-size: 15px;
              font-weight: 700;
              color: #2d3748;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 16px;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .meta-card {
              background: #f8fafc;
              border: 1px solid #edf2f7;
              border-radius: 6px;
              padding: 12px 16px;
            }
            .meta-label {
              font-size: 10px;
              text-transform: uppercase;
              color: #718096;
              font-weight: 700;
              margin-bottom: 2px;
            }
            .meta-value {
              font-size: 14px;
              color: #1a202c;
              font-weight: 600;
            }
            .mono {
              font-family: Menlo, Monaco, Consolas, "Courier New", monospace;
            }
            .notes-box {
              background-color: #f7fafc;
              border-left: 4px solid #dd6b20;
              border-radius: 0 6px 6px 0;
              padding: 18px;
              font-size: 13px;
              color: #2d3748;
              line-height: 1.6;
              white-space: pre-wrap;
            }
            .badge {
              display: inline-block;
              padding: 3px 8px;
              font-size: 10px;
              font-weight: 700;
              border-radius: 4px;
              text-transform: uppercase;
            }
            .badge-warn {
              background-color: #feebc8;
              color: #c05621;
              border: 1px solid #fbd38d;
            }
            .badge-critical {
              background-color: #fed7d7;
              color: #9b2c2c;
              border: 1px solid #feb2b2;
            }
            .signal-list {
              padding-left: 20px;
              margin: 0;
            }
            .signal-item {
              font-size: 12.5px;
              color: #4a5568;
              margin-bottom: 6px;
            }
            .footer {
              margin-top: 50px;
              border-top: 1px solid #edf2f7;
              padding-top: 20px;
              font-size: 11px;
              color: #a0aec0;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="header">
              <div class="title-area">
                <h1>Escalation Case File</h1>
                <p>Falcon Operations Gateway</p>
              </div>
              <div class="logo-placeholder">FH Risk Ops</div>
            </div>

            <div class="section">
              <h2 class="section-title">Case Metadata</h2>
              <div class="grid">
                <div class="meta-card">
                  <div class="meta-label">Incident ID</div>
                  <div class="meta-value mono">${report.txId}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Escalated Value</div>
                  <div class="meta-value" style="color: #e53e3e; font-size: 16px; font-weight: 800;">$${report.amount.toFixed(2)}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Target Dispatch Unit</div>
                  <div class="meta-value">${report.department}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Assigned Escalation Lead</div>
                  <div class="meta-value">${report.assignee}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Incident Classification</div>
                  <div class="meta-value">
                    <span class="badge ${report.unableToDetermine ? 'badge-critical' : 'badge-warn'}">
                      ${report.unableToDetermine ? 'L2 Urgent Action Blocked' : 'Analyst Standard Escalation'}
                    </span>
                  </div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Dispatch Timestamp</div>
                  <div class="meta-value">${report.timestamp}</div>
                </div>
              </div>
            </div>

            ${tx ? `
            <div class="section">
              <h2 class="section-title">Forensic Transaction Details</h2>
              <div class="grid">
                <div class="meta-card">
                  <div class="meta-label">Associated Card ID</div>
                  <div class="meta-value mono">${tx.card}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Cardholder Identity</div>
                  <div class="meta-value">${tx.customer}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Merchant & Category</div>
                  <div class="meta-value">${tx.merchant} (${tx.category})</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Transaction Channel</div>
                  <div class="meta-value">${tx.channel}</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Geographic Route</div>
                  <div class="meta-value">${tx.country} (Cardholder) ➔ ${tx.merchantCountry} (Merchant)</div>
                </div>
                <div class="meta-card">
                  <div class="meta-label">Device & IP Fingerprint</div>
                  <div class="meta-value text-sm mono">Device: ${tx.device || 'N/A'} <br/> IP: ${tx.ip || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h2 class="section-title">Fired Rules & Signals</h2>
              <ul class="signal-list">
                ${signalsHtml}
              </ul>
            </div>
            ` : ''}

            <div class="section">
              <h2 class="section-title">Analyst Diagnosis Insights & Notes</h2>
              <div class="notes-box">${report.notes || 'No investigator insights attached.'}</div>
            </div>

            <div class="footer">
              CONFIDENTIAL DOCUMENT - SECURITY AND FRAUD INVESTIGATION PURPOSES ONLY.<br/>
              Generated automatically by Falcon Gateway at ${new Date().toLocaleString()}.
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  // Keyboard Shortcuts (Alt + Shift + A/B/E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey) {
        const key = e.key.toUpperCase();
        if (key === 'A') {
          e.preventDefault();
          if (activeTx) {
            handleAction("clear", activeTx);
          }
        } else if (key === 'B') {
          e.preventDefault();
          if (activeTx) {
            handleAction("block", activeTx);
          }
        } else if (key === 'E') {
          e.preventDefault();
          if (activeTx) {
            setIsEscalationFormOpen(true);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTx, handleAction]);

  // Initialize/Reset chat when transaction changes
  useEffect(() => {
    if (!activeTx) return;
    const name = currentUser?.username || 'Lucas';
    setMsgs([
      {
        role: 'ai',
        text: `Hi ${name}. I've initiated analysis on transaction **${activeTx.id}**. \n\nYou can select the metadata fields in the top context card or ask me to open specific diagnostic panels to begin triage.`
      }
    ]);
    setActiveTab('signals');
    setExpandedSignalKey(null);
  }, [activeTx?.id, currentUser]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, thinking]);

  const handleAsk = async (q: string) => {
    if (!q.trim() || !activeTx) return;
    
    setMsgs(prev => [...prev, { role: 'me', text: q }]);
    setInput('');
    setThinking(true);

    const ql = q.toLowerCase();
    
    // Auto-switch tabs based on keywords
    if (/why|flag|reason|signal|trigger/.test(ql)) {
      setActiveTab('signals');
    } 
    else if (/location|map|country|cross-border|where/.test(ql)) {
      setActiveTab('location');
    } 
    else if (/device|ip|shared|network|device-farm|reuse/.test(ql)) {
      setActiveTab('device');
    } 
    else if (/history|card|spending|median|average|previous/.test(ql)) {
      setActiveTab('card');
    } 
    else if (/amount|cost|score|breakdown|pricing|price|discrepancy/.test(ql)) {
      setActiveTab('amount');
    }

    try {
      const res = await fetchChatResponse({
        tx: activeTx,
        history: msgs,
        message: q
      });
      setThinking(false);
      if (res && res.response) {
        setMsgs(prev => [...prev, { role: 'ai', text: res.response }]);
        
        // Auto-switch tabs based on AI response keywords
        const rl = res.response.toLowerCase();
        if (/map|location|geographic|route/i.test(rl)) {
          setActiveTab('location');
        } else if (/card history|historical|baseline|spending/i.test(rl)) {
          setActiveTab('card');
        } else if (/device|ip|shared/i.test(rl)) {
          setActiveTab('device');
        } else if (/signals|triggered|rule/i.test(rl)) {
          setActiveTab('signals');
        } else if (/amount|pricing|price|cost|score/i.test(rl)) {
          setActiveTab('amount');
        }
      } else {
        setMsgs(prev => [...prev, { role: 'ai', text: 'Error: Empty response from Copilot.' }]);
      }
    } catch (e: any) {
      console.error('Gemini chat failed:', e);
      setThinking(false);
      setMsgs(prev => [...prev, { role: 'ai', text: `Failed to generate response: ${e.message}` }]);
    }
  };

  // Render Dynamic Panel Content
  const renderRightPanel = () => {
    if (!activeTx) return null;

    switch (activeTab) {
      case 'signals':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="pulse" size={13} /> Fired Rule Signals ({activeTx.signals.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTx.signals.map((s, i) => (
                <div 
                  key={s.key || i}
                  className="signal" 
                  onClick={() => setExpandedSignalKey(expandedSignalKey === s.key ? null : s.key)}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: 8, 
                    background: expandedSignalKey === s.key ? 'var(--surface-3)' : 'var(--surface-2)', 
                    padding: 12, 
                    borderRadius: 'var(--radius-sm)', 
                    border: expandedSignalKey === s.key ? '1px solid var(--accent-line)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, width: '100%', alignItems: 'center' }}>
                    <div className="signal-ico" style={{ display: 'grid', placeItems: 'center', background: sigBgVar(s.color), color: sigColorVar(s.color), width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}>
                      <Icon name={s.icon} size={14} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-1)' }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{s.detail}</div>
                    </div>
                    <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--critical)' }}>+{s.weight.toFixed(1)}</div>
                  </div>

                  {/* Expanded Signal Details & Audit Recommendations */}
                  {expandedSignalKey === s.key && (
                    <div style={{ 
                      padding: '8px 10px', 
                      background: 'var(--surface-hi)', 
                      borderRadius: 'var(--radius-sm)', 
                      fontSize: 11.5, 
                      color: 'var(--text-2)',
                      borderTop: '1px solid var(--border)',
                      lineHeight: 1.45,
                      marginTop: 4,
                      animation: 'fadeIn 0.2s ease'
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Icon name="info" size={11} style={{ color: 'var(--accent-hi)' }} />
                        Investigation Protocol:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {s.name === 'Amount Anomaly' && (
                          <>
                            <div>• Check if cardholder has purchased high-value items in this category before.</div>
                            <div>• Contact customer to verify sudden deviation from typical ${activeTx.cardMedian} spend.</div>
                          </>
                        )}
                        {s.name === 'Geographic Mismatch' && (
                          <>
                            <div>• Review login IPs to see if traveler notice was posted.</div>
                            <div>• Check time difference: transaction occurred in different timezone.</div>
                          </>
                        )}
                        {s.name === 'Velocity Spike' && (() => {
                          const relatedTxns = txns.filter(t => t.card === activeTx.card);
                          return (
                            <>
                              <div>• Multiple cards checked out in quick succession. Indicates automated script.</div>
                              <div>• Flag associated session tokens.</div>
                              <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 6, fontSize: 11 }}>
                                  Card Transaction History (Same Card: {activeTx.card}):
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 150, overflowY: 'auto', paddingRight: 4 }}>
                                  {relatedTxns.map((rt) => (
                                    <div 
                                      key={rt.id} 
                                      style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        padding: '6px 8px', 
                                        background: rt.id === activeTx.id ? 'var(--accent-soft)' : 'var(--surface-2)', 
                                        border: rt.id === activeTx.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                                        borderRadius: 4,
                                        fontSize: 10.5
                                      }}
                                    >
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className="mono" style={{ fontWeight: rt.id === activeTx.id ? 700 : 500, color: 'var(--text)' }}>
                                          {rt.id} {rt.id === activeTx.id && '(Current)'}
                                        </span>
                                        <span style={{ color: 'var(--text-3)', fontSize: 9.5 }}>{rt.time} · {rt.merchant}</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span className="mono" style={{ fontWeight: 600, color: 'var(--text)' }}>${rt.amount.toFixed(2)}</span>
                                        <span 
                                          style={{ 
                                            fontSize: 9, 
                                            padding: '1px 4px', 
                                            borderRadius: 3, 
                                            background: rt.status === 'blocked' ? 'var(--critical-bg)' : rt.status === 'review' ? 'var(--medium-bg)' : 'var(--low-bg)', 
                                            color: rt.status === 'blocked' ? 'var(--critical)' : rt.status === 'review' ? 'var(--medium)' : 'var(--low)',
                                            fontWeight: 600
                                          }}
                                        >
                                          {rt.status}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                        {s.name === 'Device Reuse' && (
                          <>
                            <div>• Device fingerprinted is associated with dynamic cards list.</div>
                            <div>• Decline all transactions matching hardware hash.</div>
                          </>
                        )}
                        {s.name === 'Card-Testing Pattern' && (
                          <>
                            <div>• Low value test charge followed by a high value charge.</div>
                            <div>• Block card immediately and notify issuer bank.</div>
                          </>
                        )}
                        {!['Amount Anomaly', 'Geographic Mismatch', 'Velocity Spike', 'Device Reuse', 'Card-Testing Pattern'].includes(s.name) && (
                          <>
                            <div>• Audit transaction payload against rule configuration.</div>
                            <div>• Examine network hops and card dispute records.</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {activeTx.signals.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)' }}>No explicit rule signals fired. Scoring driven by Isolation Forest.</div>
              )}
            </div>
          </div>
        );

      case 'location': {
        const origin = getCountryCoord(activeTx.country);
        const dest = getCountryCoord(activeTx.merchantCountry);
        const isCrossBorder = activeTx.country !== activeTx.merchantCountry;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="globe" size={13} /> Geographic Routing</div>
            
            {/* Interactive Mapbox Map */}
            <MapboxMap originCountry={activeTx.country} destCountry={activeTx.merchantCountry} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Cardholder Base</span>
                <span style={{ fontWeight: 600 }}>{origin.name} ({activeTx.country})</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Merchant Location</span>
                <span style={{ fontWeight: 600 }}>{dest.name} ({activeTx.merchantCountry})</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Cross-border Mismatch</span>
                <span className="mono" style={{ color: isCrossBorder ? 'var(--critical)' : 'var(--low)', fontWeight: 600 }}>
                  {isCrossBorder ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Transit Distance</span>
                <span className="mono" style={{ fontWeight: 600 }}>{isCrossBorder ? '3,840 miles' : '0 miles (Local)'}</span>
              </div>
            </div>
          </div>
        );
      }

      case 'device':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="device" size={13} /> Infrastructure & Network</div>
            
            <div style={{ background: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Shared Device Fingerprint (last 24h)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--critical)' }}>
                  <div className="flex between">
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{activeTx.device || 'dev_9f42x'}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--critical)' }}>Used by 3 cards</span>
                  </div>
                </div>
                <div style={{ padding: 8, background: 'var(--surface)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--medium)' }}>
                  <div className="flex between">
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600 }}>{activeTx.ip || '184.22.91.4'}</span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--medium)' }}>VPN / Proxy proxy</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5 }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-2)' }}>Other cards on this IP:</div>
              <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div className="flex between" style={{ background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>card_83912903</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--critical)' }}>$840 (Blocked)</span>
                </div>
                <div className="flex between" style={{ background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>card_48291041</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--medium)' }}>$220 (Review)</span>
                </div>
                <div className="flex between" style={{ background: 'rgba(255,255,255,0.01)', padding: '5px 8px', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: 11.5 }}>card_28103940</span>
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--low)' }}>$12 (Cleared)</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'card':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="history" size={13} /> Cardholder Spending History</div>
            <CurveGraph tx={activeTx} />
          </div>
        );

      case 'amount':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="trend" size={13} /> Risk Score Contribution</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="flex between" style={{ fontSize: 12, marginBottom: 6 }}>
                  <span>Engine Split Ensemble</span>
                  <span className="mono" style={{ fontWeight: 600 }}>60% Rules / 40% Isolation Forest</span>
                </div>
                <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
                  <i style={{ width: '60%', background: 'var(--accent)' }} title="Rules"></i>
                  <i style={{ width: '40%', background: 'var(--violet)' }} title="Anomaly Model"></i>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Signal Influence Weight
                </div>
                {activeTx.signals.map((s, i) => (
                  <div className="brk-row" key={i} style={{ marginBottom: 10 }}>
                    <div className="brk-name" style={{ width: 140, fontSize: 12 }} title={s.name}>{s.name}</div>
                    <div className="brk-bar"><i style={{ width: Math.min(100, s.weight / 2.5 * 100) + "%", background: sigColorVar(s.color) }}></i></div>
                    <div className="brk-val">{s.weight.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'time':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="clock" size={13} /> Velocity & Timestamp Analysis</div>
            
            <div style={{ background: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
              <div className="flex between" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="clock" size={15} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Overnight window</span>
                </div>
                <span className="mono" style={{ fontSize: 12, color: 'var(--medium)' }}>{activeTx.time}</span>
              </div>
              <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.45 }}>
                This charge was processed at local time **{activeTx.time}**. Based on history for this card, the owner has a 97% probability of sleeping during this hour.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, marginTop: 4 }}>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>15-Min Velocity</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>3 transactions</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>1-Hour Velocity</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>6 transactions</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Merchant Category Velocity</span>
                <span className="mono" style={{ fontWeight: 600 }}>Suspicious burst (Electronics)</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="content fade-in" style={{ height: '100vh', display: 'grid', gridTemplateColumns: '260px 1fr 580px', gap: 14, padding: '14px', overflow: 'hidden' }}>
      
      {/* 1. Left triage queue sidebar */}
      <QueueSidebar 
        triageQueue={triageQueue}
        activeTx={activeTx}
        setSelectedTx={setSelectedTx}
        escalatedReports={escalatedReports}
        setViewingReport={setViewingReport}
        sidebarTab={sidebarTab}
        setSidebarTab={setSidebarTab}
      />

      {/* 2. Middle AI Investigation Chat Arena (Combined 38% height context + 62% height chat) */}
      {activeTx ? (
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden', padding: '0 8px' }}>
          
          {/* Combined Transaction Card & Chip Grid Selector (Row 1: 38%) */}
          <ContextCard 
            activeTx={activeTx}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Chat scrolling viewport + Input Area (Row 2: 70%) */}
          <CopilotChat 
            activeTx={activeTx}
            msgs={msgs}
            input={input}
            setInput={setInput}
            thinking={thinking}
            handleAsk={handleAsk}
            handleAction={handleAction}
            onOpenEscalation={() => setIsEscalationFormOpen(true)}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', height: '100%', color: 'var(--text-3)' }}>
          <div>
            <Icon name="shield" size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div>No transactions selected for analysis.</div>
          </div>
        </div>
      )}

      {/* 3. Right column: Dynamic panel (Larger width 420px) */}
      {activeTx ? (
        <div style={{ height: '100%', overflowY: 'auto', borderLeft: '1px solid var(--border)', paddingLeft: 12, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 14 }}>
          {/* Quick tab filters at top */}
          <div style={{ padding: '12px 0 6px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Dynamic Panel</span>
            <div style={{ display: 'flex', gap: 4 }}>
              {(['signals', 'location', 'device', 'card', 'time'] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'transparent',
                    border: 0,
                    cursor: 'pointer',
                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-3)',
                    padding: '2px 4px'
                  }}
                  title={`Switch to ${tab}`}
                >
                  <Icon 
                    name={
                      tab === 'signals' ? 'pulse' :
                      tab === 'location' ? 'globe' :
                      tab === 'device' ? 'device' :
                      tab === 'card' ? 'history' : 'clock'
                    } 
                    size={14} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowY: 'auto', paddingBottom: 16 }}>
            {renderRightPanel()}
          </div>
        </div>
      ) : (
        <div style={{ borderLeft: '1px solid var(--border)' }}></div>
      )}

      {/* Create Escalation Report Modal */}
      {isEscalationFormOpen && activeTx && (
        <EscalationModal 
          activeTx={activeTx}
          onClose={() => setIsEscalationFormOpen(false)}
          onConfirm={handleConfirmEscalation}
        />
      )}

      {/* View Escalated Report Modal */}
      {viewingReport && (
        <ReportViewerModal 
          viewingReport={viewingReport}
          associatedTx={txns.find(t => t.id === viewingReport.txId) || null}
          onClose={() => setViewingReport(null)}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
}
