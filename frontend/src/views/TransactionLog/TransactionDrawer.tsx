import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { Icon, StatusPill, ScoreBar, sigColorVar, sigBgVar } from '../../components';
import type { Transaction } from '../../types';
import { FRAUD } from '../../data';
import { fetchChatResponse } from '../../services/api';
import { parseMarkdown } from '../AIHub/components/MarkdownParser';
import { MapboxMap } from '../AIHub/components/MapboxMap';

// ── Human-readable country names for the geo detail cards ────────────────────
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', GB: 'United Kingdom',
  DE: 'Germany', FR: 'France', CN: 'China', JP: 'Japan',
  BR: 'Brazil', IN: 'India', RU: 'Russia', AU: 'Australia',
  ZA: 'South Africa', MX: 'Mexico', IT: 'Italy', ES: 'Spain',
  NL: 'Netherlands', SG: 'Singapore',
};

function countryName(code: string) {
  return COUNTRY_NAMES[code?.toUpperCase?.()] || code;
}

// ── Drawer tab keys ───────────────────────────────────────────────────────────
type DrawerTab = 'overview' | 'flags' | 'geo' | 'chat';

interface TransactionDrawerProps {
  tx: Transaction | null;
  onClose: () => void;
  onAction: (action: string, tx: Transaction) => void;
  currentUser?: { username: string } | null;
}

export function TransactionDrawer({ tx, onClose, onAction, currentUser }: TransactionDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>('overview');
  const [msgs, setMsgs] = useState<{ role: 'me' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Reset chat & tab when selected transaction changes
  useEffect(() => {
    if (!tx) return;
    const name = currentUser?.username || 'Analyst';
    setMsgs([{
      role: 'ai',
      text: `Hi ${name}. I'm ready to help you investigate **${tx.id}**.\n\nAsk me about flags, location risks, card history, or device fingerprint.`
    }]);
    setInput('');
    setThinking(false);
    setTab('overview');
  }, [tx?.id, currentUser]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, thinking]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleAsk = async (q: string) => {
    if (!q.trim() || !tx) return;
    setMsgs(prev => [...prev, { role: 'me', text: q }]);
    setInput('');
    setThinking(true);
    try {
      const res = await fetchChatResponse({ tx, history: msgs, message: q });
      setThinking(false);
      setMsgs(prev => [...prev, { role: 'ai', text: res?.response || 'No response from Gemini.' }]);
    } catch (e: any) {
      setThinking(false);
      setMsgs(prev => [...prev, { role: 'ai', text: `Error: ${e.message}` }]);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) handleAsk(input);
  };

  const sev = tx ? FRAUD.sevOf(tx.score) : 'low';
  const sevColor = sev === 'critical' ? 'var(--critical)' : sev === 'high' ? 'var(--high)' : sev === 'medium' ? 'var(--medium)' : 'var(--low)';
  const sevBg = sev === 'critical' ? 'var(--critical-bg)' : sev === 'high' ? 'var(--high-bg)' : sev === 'medium' ? 'var(--medium-bg)' : 'var(--low-bg)';

  const isCross = tx && tx.country && tx.merchantCountry && tx.country !== tx.merchantCountry;

  const tabs: { key: DrawerTab; icon: string; label: string }[] = [
    { key: 'overview', icon: 'info', label: 'Overview' },
    { key: 'flags',    icon: 'bolt', label: 'Signals' },
    { key: 'geo',      icon: 'globe', label: 'Geo' },
    { key: 'chat',     icon: 'sparkle', label: 'Gemini' },
  ];

  return (
    <>
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.25)',
          backdropFilter: 'blur(2px)',
          zIndex: 400,
          opacity: tx ? 1 : 0,
          transition: 'opacity 0.25s',
          pointerEvents: tx ? 'auto' : 'none',
        }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-20px 0 60px rgba(15,23,42,0.12)',
        zIndex: 401,
        display: 'grid',
        gridTemplateRows: 'auto auto 1fr',
        transform: tx ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        {tx && (
          <>
            <div style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                {/* Severity badge */}
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-sm)',
                  background: sevBg,
                  border: `1px solid ${sevColor}30`,
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <Icon name="bolt" size={18} style={{ color: sevColor }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: 14 }}>{tx.id}</span>
                    <StatusPill status={tx.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span>{tx.merchant}</span>
                    <span style={{ color: 'var(--border-2)' }}>·</span>
                    <span className="mono" style={{ fontWeight: 600, color: sevColor }}>{FRAUD.money(tx.amount)}</span>
                    <span style={{ color: 'var(--border-2)' }}>·</span>
                    <span>{tx.time}</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="icon-btn"
                  style={{ width: 30, height: 30, flexShrink: 0 }}
                  title="Close (Esc)"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              {/* Score bar */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Risk Score</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: sevColor }}>{(tx.score * 100).toFixed(1)}%</span>
                </div>
                <ScoreBar score={tx.score} />
              </div>
            </div>

            {/* ── Tab Bar ── */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border)',
              background: 'var(--surface-2)',
              padding: '0 8px',
            }}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '10px 0',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    color: tab === t.key ? 'var(--accent)' : 'var(--text-3)',
                    borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon name={t.icon} size={13} />
                  {t.label}
                  {t.key === 'flags' && tx.signals?.length > 0 && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, background: sevColor, color: '#fff',
                      borderRadius: 99, padding: '1px 5px', lineHeight: 1.6,
                    }}>
                      {tx.signals.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Tab Content ── */}
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

              {/* ─── OVERVIEW ─── */}
              {tab === 'overview' && (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Card Info */}
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="device" size={12} /> Card & Cardholder
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Card Number', value: tx.card, mono: true },
                        { label: 'Cardholder', value: tx.customer },
                        { label: 'Channel', value: tx.channel },
                        { label: 'Type', value: tx.type },
                        { label: 'Card Median', value: FRAUD.money(tx.cardMedian), mono: true },
                        { label: 'Category', value: tx.category },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
                          <div className={mono ? 'mono' : ''} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{value || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Network / Device */}
                  <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="network" size={12} /> Network & Device
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Device ID', value: tx.device, mono: true },
                        { label: 'IP Address', value: tx.ip, mono: true },
                        { label: 'Cardholder Country', value: tx.country },
                        { label: 'Merchant Country', value: tx.merchantCountry },
                      ].map(({ label, value, mono }) => (
                        <div key={label}>
                          <div style={{ fontSize: 10, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{label}</div>
                          <div className={mono ? 'mono' : ''} style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{value || '—'}</div>
                        </div>
                      ))}
                    </div>
                    {isCross && (
                      <div style={{ marginTop: 10, padding: '7px 10px', background: 'var(--high-bg)', border: '1px solid rgba(234,88,12,0.2)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Icon name="globe" size={12} style={{ color: 'var(--high)', flexShrink: 0 }} />
                        <span style={{ fontSize: 11.5, color: 'var(--high)', fontWeight: 600 }}>Cross-border: {tx.country} → {tx.merchantCountry}</span>
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <button
                      className="act-btn danger"
                      onClick={() => onAction('block', tx)}
                      style={{ opacity: tx.status === 'blocked' ? 1 : 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Icon name="block" size={13} /> Block
                    </button>
                    <button
                      className="act-btn ok"
                      onClick={() => onAction('clear', tx)}
                      style={{ opacity: tx.status === 'cleared' ? 1 : 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Icon name="check" size={13} /> Approve
                    </button>
                    <button
                      className="act-btn warn"
                      onClick={() => onAction('false_positive', tx)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    >
                      <Icon name="flag" size={13} /> FP Flag
                    </button>
                  </div>
                </div>
              )}

              {/* ─── FLAGS / SIGNALS ─── */}
              {tab === 'flags' && (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {tx.signals && tx.signals.length > 0 ? tx.signals.map((sig, i) => (
                    <div key={i} style={{
                      background: 'var(--surface-2)',
                      border: `1px solid ${sigColorVar(sig.color)}30`,
                      borderLeft: `3px solid ${sigColorVar(sig.color)}`,
                      borderRadius: 'var(--radius)',
                      padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6,
                          background: sigBgVar(sig.color),
                          display: 'grid', placeItems: 'center', flexShrink: 0,
                        }}>
                          <Icon name={sig.icon || 'bolt'} size={11} style={{ color: sigColorVar(sig.color) }} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>{sig.name}</span>
                        <span className="mono" style={{
                          fontSize: 10.5, fontWeight: 700,
                          color: sigColorVar(sig.color),
                          background: sigBgVar(sig.color),
                          padding: '2px 7px', borderRadius: 99,
                        }}>w={sig.weight?.toFixed(1)}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-2)', lineHeight: 1.5 }}>{sig.detail}</div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-4)' }}>
                      <Icon name="check" size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
                      <div style={{ fontSize: 13 }}>No rule signals fired</div>
                      <div style={{ fontSize: 11.5, marginTop: 4 }}>Classification based on anomaly ensemble score</div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── GEO ─── */}
              {tab === 'geo' && (
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Real Mapbox map — same implementation as AIHub */}
                  <MapboxMap
                    originCountry={tx.country}
                    destCountry={tx.merchantCountry}
                  />

                  {/* Geo detail cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 'var(--radius)', padding: 14 }}>
                      <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Cardholder Origin</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tx.country}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{countryName(tx.country)}</div>
                    </div>
                    <div style={{
                      background: isCross ? 'var(--high-bg)' : 'var(--low-bg)',
                      border: `1px solid ${isCross ? 'rgba(234,88,12,0.2)' : 'rgba(22,163,74,0.2)'}`,
                      borderRadius: 'var(--radius)', padding: 14
                    }}>
                      <div style={{ fontSize: 10, color: isCross ? 'var(--high)' : 'var(--low)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Merchant Location</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{tx.merchantCountry}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{countryName(tx.merchantCountry)}</div>
                    </div>
                  </div>

                  {isCross ? (
                    <div style={{ padding: '11px 14px', background: 'var(--high-bg)', border: '1px solid rgba(234,88,12,0.25)', borderRadius: 'var(--radius)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon name="globe" size={14} style={{ color: 'var(--high)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: 'var(--high)', fontWeight: 600 }}>Cross-border transaction detected — geographic mismatch is a known fraud risk indicator.</span>
                    </div>
                  ) : (
                    <div style={{ padding: '11px 14px', background: 'var(--low-bg)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 'var(--radius)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Icon name="check" size={14} style={{ color: 'var(--low)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12.5, color: 'var(--low)', fontWeight: 600 }}>Cardholder and merchant are in the same country — no geographic mismatch.</span>
                    </div>
                  )}
                </div>
              )}

              {/* ─── COPILOT CHAT ─── */}
              {tab === 'chat' && (
                <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr auto', height: '100%', minHeight: 0, padding: '12px 16px 0' }}>
                  {/* Messages */}
                  <div ref={chatRef} style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>
                    {msgs.map((m, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start' }}>
                        {m.role === 'ai' && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                            <Icon name="sparkle" size={11} style={{ color: 'var(--accent-hi)' }} />
                          </div>
                        )}
                        <div style={{
                          maxWidth: '82%',
                          background: m.role === 'me' ? 'var(--accent)' : 'var(--surface-2)',
                          color: m.role === 'me' ? '#fff' : 'var(--text)',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 12.5,
                          lineHeight: 1.5,
                          border: m.role === 'me' ? 'none' : '1px solid var(--border)',
                        }}>
                          {parseMarkdown(m.text)}
                        </div>
                        {m.role === 'me' && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border-hi)', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700, color: 'var(--accent-hi)', flexShrink: 0 }}>
                            {(currentUser?.username || 'U').substring(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    ))}
                    {thinking && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon name="sparkle" size={11} style={{ color: 'var(--accent-hi)' }} />
                        </div>
                        <div className="typing-dots" style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }} />
                          <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }} />
                          <i style={{ width: 5, height: 5, background: 'var(--text-3)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input area */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, paddingBottom: 16 }}>
                    {/* Quick suggest chips */}
                    {msgs.length <= 2 && !thinking && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        {['Why was this flagged?', 'Geo risk assessment', 'Any related devices?', 'Card spending history'].map(q => (
                          <div
                            key={q}
                            className="suggest-chip"
                            onClick={() => handleAsk(q)}
                            style={{ cursor: 'pointer' }}
                          >
                            {q}
                          </div>
                        ))}
                      </div>
                    )}
                    <form onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px' }}>
                      <Icon name="sparkle" size={14} style={{ color: 'var(--text-3)', marginRight: 8, flexShrink: 0 }} />
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={`Ask Gemini about ${tx.id}…`}
                        style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: 'var(--text)', fontSize: 13 }}
                      />
                      <button
                        type="submit"
                        disabled={!input.trim()}
                        style={{ background: 'transparent', border: 0, padding: 4, cursor: 'pointer', color: input.trim() ? 'var(--accent-hi)' : 'var(--text-4)' }}
                      >
                        <Icon name="send" size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </>
  );
}
