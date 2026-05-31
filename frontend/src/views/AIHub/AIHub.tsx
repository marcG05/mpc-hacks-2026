import { useState, useEffect, useRef, useMemo } from 'react';
import { Icon, SevTag, Sparkline, sigColorVar, sigBgVar } from '../../components';
import type { Transaction } from '../../types';

interface AIHubProps {
  txns: Transaction[];
  initialSelectedTx?: Transaction | null;
  onAction: (action: string, tx: Transaction) => void;
}

type TabKey = 'amount' | 'location' | 'device' | 'card' | 'signals' | 'time';

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

export function AIHub({ txns, initialSelectedTx, onAction }: AIHubProps) {
  // 1. Filter queue for transactions that are flagged or in review
  const triageQueue = useMemo(() => {
    return txns.filter(t => t.status === 'flagged' || t.status === 'review');
  }, [txns]);

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

  // 4. Chat messaging states
  const [msgs, setMsgs] = useState<{ role: 'me' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Initialize/Reset chat when transaction changes
  useEffect(() => {
    if (!activeTx) return;
    setMsgs([
      {
        role: 'ai',
        text: `Hi Lucas. I've analyzed transaction **${activeTx.id}** (${activeTx.merchant}, amount **$${activeTx.amount.toFixed(2)}**). It scored **${(activeTx.score * 100).toFixed(0)}% risk**.\n\nI'm ready to investigate. You can ask about: \n- **History** of ${activeTx.card}\n- **Device** and **IP** network analysis\n- **Geographic anomalies** or **Risk signals** triggered.`
      }
    ]);
    setActiveTab('signals');
  }, [activeTx?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, thinking]);

  // 5. Mock responses matching user questions & activating panels
  const handleAsk = (q: string) => {
    if (!q.trim() || !activeTx) return;
    
    // Add user message
    setMsgs(prev => [...prev, { role: 'me', text: q }]);
    setInput('');
    setThinking(true);

    const ql = q.toLowerCase();
    let reply = '';

    // Handle questions and auto-switch tabs
    if (/why|flag|reason|signal|trigger/.test(ql)) {
      setActiveTab('signals');
      reply = `I have loaded the **Risk Signals** panel on the right.\n\n${activeTx.id} triggered ${activeTx.signals.length} high-confidence rule signals: \n` +
        activeTx.signals.map(s => `• **${s.name}** (+${s.weight.toFixed(2)} weight): ${s.detail}`).join('\n') +
        `\n\nThe ensemble combines these weights with a local Isolation Forest anomaly model, leading to the overall **${(activeTx.score * 100).toFixed(0)}% score**.`;
    } 
    else if (/location|map|country|cross-border|where/.test(ql)) {
      setActiveTab('location');
      const origin = getCountryCoord(activeTx.country);
      const dest = getCountryCoord(activeTx.merchantCountry);
      reply = `I have opened the **Geographic Map** visualization.\n\n• **Cardholder Country**: ${origin.name} (${activeTx.country})\n• **Merchant Country**: ${dest.name} (${activeTx.merchantCountry})\n\nThis cross-border route represents a physical distance of approximately **${activeTx.country === activeTx.merchantCountry ? '0' : '3,840'} miles**. Since the card was used locally in **${origin.name}** just 18 minutes prior, this represents an impossible transit velocity.`;
    } 
    else if (/device|ip|shared|network|device-farm|reuse/.test(ql)) {
      setActiveTab('device');
      reply = `I've opened the **Network Infrastructure** graph on the right.\n\n• **Device Fingerprint**: \`${activeTx.device || 'device_9a4f'}\`\n• **IP Address**: \`${activeTx.ip || '184.22.91.4'}\`\n\nOur system detected that this IP address is currently hosting **3 other active cards** within a 1-hour window, suggesting a dynamic routing proxy or coordinated card testing. I strongly recommend blocking this endpoint.`;
    } 
    else if (/history|card|spending|median|average|previous/.test(ql)) {
      setActiveTab('card');
      reply = `I've opened the **Card Baseline** panel on the right.\n\nOn card **${activeTx.card}**, the usual median purchase is **$${activeTx.cardMedian.toFixed(2)}**. The current charge of **$${activeTx.amount.toFixed(2)}** is **${(activeTx.amount / Math.max(1, activeTx.cardMedian)).toFixed(1)}x** their historical median. The historical activity timeline shows a sudden high-velocity volume burst after months of low retail activity.`;
    } 
    else if (/amount|cost|score|breakdown/.test(ql)) {
      setActiveTab('amount');
      reply = `I have opened the **Score Contribution** graph.\n\nYou can see how the rule-based ensemble is blended 60/40 with the Isolation Forest anomaly detector. The highest single contributor is the **${activeTx.signals[0]?.name || 'unusual amount'}** (+${(activeTx.signals[0]?.weight || 1).toFixed(2)}).`;
    }
    else if (/recommend|do|action|block|approve/.test(ql)) {
      const actionRec = activeTx.score >= 0.8 ? "Block & Escalate" : activeTx.score >= 0.5 ? "Hold for verification" : "Approve";
      reply = `**Recommendation: ${actionRec}**.\n\nThe high confidence score of ${(activeTx.score * 100).toFixed(0)}% is supported by multiple infrastructure flags. The potential chargeback liability on this $${activeTx.amount.toFixed(2)} transaction exceeds the merchant threshold.`;
    } 
    else {
      reply = `I'm tracking **${activeTx.id}**. Ask me to show the **map**, analyze the **card history**, or inspect the **triggered signals** to load live charts in the investigation panel.`;
    }

    // Simulate thinking delay then stream reply
    setTimeout(() => {
      setThinking(false);
      setMsgs(prev => [...prev, { role: 'ai', text: reply }]);
    }, 600);
  };

  // Render Dynamic Panel Content
  const renderRightPanel = () => {
    if (!activeTx) return null;

    switch (activeTab) {
      case 'signals':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="pulse" size={13} /> Active Signals ({activeTx.signals.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTx.signals.map((s, i) => (
                <div className="signal" key={i} style={{ display: 'flex', gap: 10, background: 'var(--surface-2)', padding: 10, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div className="signal-ico" style={{ display: 'grid', placeItems: 'center', background: sigBgVar(s.color), color: sigColorVar(s.color), width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }}>
                    <Icon name={s.icon} size={14} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--text-1)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{s.detail}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--critical)' }}>+{s.weight.toFixed(1)}</div>
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

        // Dynamic Bezier curves for map arcs
        const dx = dest.x - origin.x;
        const dy = dest.y - origin.y;
        const mx = origin.x + dx / 2;
        const my = origin.y + dy / 2 - 30; // Curve arc upwards

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="sec-label" style={{ margin: 0 }}><Icon name="globe" size={13} /> Geographic Routing</div>
            
            {/* World Map vector placeholder (Interactive SVG) */}
            <div style={{ background: 'var(--surface-hi)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', position: 'relative', height: 160, overflow: 'hidden' }}>
              <svg width="100%" height="100%" viewBox="0 0 500 160" style={{ background: '#090e1a' }}>
                {/* Simulated continents/grid lines */}
                <path d="M 30,50 Q 80,40 100,60 T 160,110 T 200,120 M 230,40 Q 280,30 320,60 T 400,90" stroke="rgba(255,255,255,0.03)" strokeWidth="8" fill="none" />
                
                {/* Arc path */}
                {isCrossBorder && (
                  <>
                    <path d={`M ${origin.x} ${origin.y} Q ${mx} ${my} ${dest.x} ${dest.y}`} fill="none" stroke="var(--critical)" strokeWidth="2.5" strokeDasharray="4,4" className="pulse" />
                    <circle cx={mx} cy={my - 5} r="4" fill="#fff" />
                  </>
                )}

                {/* Country Pins */}
                <circle cx={origin.x} cy={origin.y} r="6" fill="var(--low)" />
                <circle cx={origin.x} cy={origin.y} r="12" fill="var(--low)" opacity="0.3" />
                
                <circle cx={dest.x} cy={dest.y} r="6" fill="var(--critical)" />
                <circle cx={dest.x} cy={dest.y} r="12" fill="var(--critical)" opacity="0.3" />
              </svg>
            </div>

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
            
            {/* Device association diagram */}
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
            
            <div className="card" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex between" style={{ alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Last 22 Transactions</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>Median: ${activeTx.cardMedian.toFixed(2)}</span>
              </div>
              <div style={{ padding: '8px 0', display: 'grid', placeItems: 'center' }}>
                <Sparkline data={activeTx.history} w={280} h={50} color="var(--accent)" />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5 }}>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Current Charge</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>${activeTx.amount.toFixed(2)}</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Z-Score Dev</span>
                <span className="mono" style={{ fontWeight: 600, color: 'var(--critical)' }}>+3.4 standard dev</span>
              </div>
              <div className="flex between" style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>Avg Category Spend</span>
                <span className="mono" style={{ fontWeight: 600 }}>${(activeTx.cardMedian * 0.8).toFixed(2)}</span>
              </div>
            </div>
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
    <div className="content fade-in" style={{ height: 'calc(100vh - 60px)', display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: 14, padding: '0 14px 14px 14px', overflow: 'hidden' }}>
      
      {/* 1. Left triage queue sidebar */}
      <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
        <div style={{ padding: '12px 0 8px' }}>
          <div className="sec-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="layers" size={13} /> Flagged Queue ({triageQueue.length})
          </div>
        </div>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
          {triageQueue.map(t => {
            const isActive = activeTx && t.id === activeTx.id;
            return (
              <div 
                key={t.id}
                onClick={() => setSelectedTx(t)}
                style={{
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--surface-3)' : 'var(--surface-2)',
                  border: isActive ? '1px solid var(--accent-line)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, border-color 0.15s'
                }}
              >
                <div className="flex between" style={{ marginBottom: 4 }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 11.5, color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}>{t.id}</span>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: t.score >= 0.8 ? 'var(--critical)' : 'var(--high)' }}>
                    {(t.score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex between" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
                  <span className="mono">${t.amount.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
          {triageQueue.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
              <Icon name="check" size={28} style={{ color: 'var(--low)', marginBottom: 8, opacity: 0.5 }} />
              <div>Queue is clean</div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Middle AI Investigation Chat Arena */}
      {activeTx ? (
        <div style={{ display: 'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100%', overflow: 'hidden', padding: '0 8px' }}>
          
          {/* Header metadata summary card */}
          <div style={{ padding: '10px 0' }}>
            <div className="card" style={{ padding: 12, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex between" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>${activeTx.amount.toFixed(2)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{activeTx.merchant} · {activeTx.category}</div>
                </div>
                <SevTag score={activeTx.score} />
              </div>
            </div>
          </div>

          {/* Context chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <button 
              className={`chip ${activeTab === 'amount' ? 'active' : ''}`}
              onClick={() => setActiveTab('amount')}
              style={{ padding: '5px 8px', fontSize: 11.5, background: activeTab === 'amount' ? 'var(--accent-soft)' : 'var(--surface-2)', border: activeTab === 'amount' ? '1px solid var(--accent-line)' : '1px solid var(--border)', color: activeTab === 'amount' ? 'var(--accent-hi)' : 'var(--text-2)', borderRadius: 16, cursor: 'pointer' }}
            >
              <Icon name="trend" size={11} style={{ marginRight: 4 }} /> Amt: ${activeTx.amount}
            </button>
            
            <button 
              className={`chip ${activeTab === 'location' ? 'active' : ''}`}
              onClick={() => setActiveTab('location')}
              style={{ padding: '5px 8px', fontSize: 11.5, background: activeTab === 'location' ? 'var(--accent-soft)' : 'var(--surface-2)', border: activeTab === 'location' ? '1px solid var(--accent-line)' : '1px solid var(--border)', color: activeTab === 'location' ? 'var(--accent-hi)' : 'var(--text-2)', borderRadius: 16, cursor: 'pointer' }}
            >
              <Icon name="globe" size={11} style={{ marginRight: 4 }} /> Geo: {activeTx.country}→{activeTx.merchantCountry}
            </button>

            <button 
              className={`chip ${activeTab === 'device' ? 'active' : ''}`}
              onClick={() => setActiveTab('device')}
              style={{ padding: '5px 8px', fontSize: 11.5, background: activeTab === 'device' ? 'var(--accent-soft)' : 'var(--surface-2)', border: activeTab === 'device' ? '1px solid var(--accent-line)' : '1px solid var(--border)', color: activeTab === 'device' ? 'var(--accent-hi)' : 'var(--text-2)', borderRadius: 16, cursor: 'pointer' }}
            >
              <Icon name="device" size={11} style={{ marginRight: 4 }} /> Dev: {activeTx.device ? activeTx.device.slice(0, 7) : 'n/a'}
            </button>

            <button 
              className={`chip ${activeTab === 'card' ? 'active' : ''}`}
              onClick={() => setActiveTab('card')}
              style={{ padding: '5px 8px', fontSize: 11.5, background: activeTab === 'card' ? 'var(--accent-soft)' : 'var(--surface-2)', border: activeTab === 'card' ? '1px solid var(--accent-line)' : '1px solid var(--border)', color: activeTab === 'card' ? 'var(--accent-hi)' : 'var(--text-2)', borderRadius: 16, cursor: 'pointer' }}
            >
              <Icon name="history" size={11} style={{ marginRight: 4 }} /> Card: {activeTx.card ? activeTx.card.slice(0, 8) : 'n/a'}
            </button>

            <button 
              className={`chip ${activeTab === 'signals' ? 'active' : ''}`}
              onClick={() => setActiveTab('signals')}
              style={{ padding: '5px 8px', fontSize: 11.5, background: activeTab === 'signals' ? 'var(--accent-soft)' : 'var(--surface-2)', border: activeTab === 'signals' ? '1px solid var(--accent-line)' : '1px solid var(--border)', color: activeTab === 'signals' ? 'var(--accent-hi)' : 'var(--text-2)', borderRadius: 16, cursor: 'pointer' }}
            >
              <Icon name="pulse" size={11} style={{ marginRight: 4 }} /> Rules: {activeTx.signals.length} hits
            </button>

            <button 
              className={`chip ${activeTab === 'time' ? 'active' : ''}`}
              onClick={() => setActiveTab('time')}
              style={{ padding: '5px 8px', fontSize: 11.5, background: activeTab === 'time' ? 'var(--accent-soft)' : 'var(--surface-2)', border: activeTab === 'time' ? '1px solid var(--accent-line)' : '1px solid var(--border)', color: activeTab === 'time' ? 'var(--accent-hi)' : 'var(--text-2)', borderRadius: 16, cursor: 'pointer' }}
            >
              <Icon name="clock" size={11} style={{ marginRight: 4 }} /> Time: {activeTx.time}
            </button>
          </div>

          {/* Chat scrolling viewport */}
          <div className="chat-msgs" ref={chatRef} style={{ overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {msgs.map((m, i) => (
              <div className={`msg ${m.role === 'me' ? 'me' : ''}`} key={i} style={{ display: 'flex', gap: 10, justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start' }}>
                {m.role !== 'me' && (
                  <div className="msg-ava ai" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Icon name="sparkle" size={12} style={{ color: 'var(--accent-hi)' }} />
                  </div>
                )}
                <div 
                  className="msg-bubble" 
                  style={{ 
                    maxWidth: '85%', 
                    background: m.role === 'me' ? 'var(--accent)' : 'var(--surface-2)', 
                    color: m.role === 'me' ? '#fff' : 'var(--text)', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)', 
                    fontSize: 12.5, 
                    lineHeight: 1.5,
                    border: m.role === 'me' ? 'none' : '1px solid var(--border)',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {m.text}
                </div>
                {m.role === 'me' && (
                  <div className="msg-ava user" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--border-hi)', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 700, flexShrink: 0 }}>
                    LM
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="msg" style={{ display: 'flex', gap: 10 }}>
                <div className="msg-ava ai" style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Icon name="sparkle" size={12} style={{ color: 'var(--accent-hi)' }} />
                </div>
                <div className="typing-dots" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></i>
                  <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></i>
                  <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></i>
                </div>
              </div>
            )}
          </div>

          {/* Chat input form and decision bar */}
          <div style={{ borderTop: '1px solid var(--border)', padding: '10px 0 0' }}>
            
            {/* Inline quick suggestion chips */}
            {msgs.length <= 2 && !thinking && (
              <div className="chat-suggest" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <div className="suggest-chip" onClick={() => handleAsk("Why was this flagged?")}>Why was this flagged?</div>
                <div className="suggest-chip" onClick={() => handleAsk("Show me the map & locations")}>Show locations on map</div>
                <div className="suggest-chip" onClick={() => handleAsk("Compare to historical card baseline")}>Check card history</div>
                <div className="suggest-chip" onClick={() => handleAsk("Verify device or IP association")}>Any related devices?</div>
              </div>
            )}

            {/* Chat submit bar */}
            <form className="chat-input" onSubmit={(e) => { e.preventDefault(); handleAsk(input); }} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', marginBottom: 12 }}>
              <Icon name="sparkle" size={15} style={{ color: 'var(--text-3)', marginRight: 8 }} />
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={`Ask Copilot about ${activeTx.id}...`}
                style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: '#fff', fontSize: 13 }}
              />
              <button 
                className="send-btn" 
                type="submit" 
                disabled={!input.trim()}
                style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: input.trim() ? 'var(--accent-hi)' : 'var(--text-4)' }}
              >
                <Icon name="send" size={14} />
              </button>
            </form>

            {/* Analyst triage actions */}
            <div className="aip-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingBottom: 6 }}>
              <button 
                className={`act-btn danger ${activeTx.status === 'blocked' ? 'active' : ''}`} 
                onClick={() => onAction("block", activeTx)}
                style={{ opacity: activeTx.status === 'blocked' ? 1 : 0.8 }}
              >
                <Icon name="block" size={14} /> Block
              </button>
              <button 
                className={`act-btn ok ${activeTx.status === 'cleared' ? 'active' : ''}`} 
                onClick={() => onAction("clear", activeTx)}
                style={{ opacity: activeTx.status === 'cleared' ? 1 : 0.8 }}
              >
                <Icon name="check" size={14} /> Approve
              </button>
              <button 
                className={`act-btn warn ${activeTx.status === 'escalated' ? 'active' : ''}`} 
                onClick={() => onAction("escalate", activeTx)}
                style={{ opacity: activeTx.status === 'escalated' ? 1 : 0.8 }}
              >
                <Icon name="escalate" size={14} /> Escalate
              </button>
              <button 
                className={`act-btn ${activeTx.status === 'false_positive' ? 'active' : ''}`} 
                onClick={() => onAction("false_positive", activeTx)}
                style={{ opacity: activeTx.status === 'false_positive' ? 1 : 0.8 }}
              >
                <Icon name="flag" size={14} /> FP
              </button>
            </div>

          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', placeItems: 'center', textAlign: 'center', height: '100%', color: 'var(--text-3)' }}>
          <div>
            <Icon name="shield" size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
            <div>No transactions selected for analysis.</div>
          </div>
        </div>
      )}

      {/* 3. Right column: Dynamic panel */}
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
    </div>
  );
}
