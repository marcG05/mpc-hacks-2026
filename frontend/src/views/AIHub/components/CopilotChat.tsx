import { useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../../components';
import type { Transaction } from '../../../types';
import { parseMarkdown, parseMarkdownLinks } from './MarkdownParser';

interface CopilotChatProps {
  activeTx: Transaction;
  msgs: { role: 'me' | 'ai'; text: string }[];
  input: string;
  setInput: (v: string) => void;
  thinking: boolean;
  handleAsk: (q: string) => void;
  handleAction: (action: string, tx: Transaction) => void;
  onOpenEscalation: () => void;
}

export function CopilotChat({
  activeTx,
  msgs,
  input,
  setInput,
  thinking,
  handleAsk,
  handleAction,
  onOpenEscalation,
}: CopilotChatProps) {
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [msgs, thinking]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      handleAsk(input);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', overflow: 'hidden', background: 'var(--chat-bg)' }}>

      {/* ── Scrollable messages ─────────────────────────────── */}
      <div
        ref={chatRef}
        className="chat-msgs"
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
            }}
          >
            {/* AI avatar */}
            {m.role !== 'me' && (
              <div className="msg-ai-avatar">
                <Icon name="sparkle" size={13} style={{ color: 'var(--primary)' }} />
              </div>
            )}

            {/* Bubble */}
            <div
              className={m.role === 'me' ? 'msg-user-bubble' : 'msg-ai-bubble'}
            >
              {m.role === 'ai' && (
                <div className="ai-card-header">
                  <div className="ai-card-tabs">
                    <button type="button" className="ai-card-tab active">Gemini 3.5 Flash</button>
                    <button type="button" className="ai-card-tab">Deep-Risk</button>
                    <button type="button" className="ai-card-tab">Core-Ensemble</button>
                  </div>
                  <button
                    type="button"
                    className="ai-card-copy"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(m.text);
                      } catch (err) {
                        // fallback
                      }
                    }}
                    title="Copy response to clipboard"
                  >
                    <Icon name="note" size={11} />
                    Copy
                  </button>
                </div>
              )}
              {parseMarkdown(m.text)}

              {/* Reference links widget */}
              {m.role === 'ai' && (() => {
                const links = parseMarkdownLinks(m.text);
                if (links.length === 0) return null;
                return (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {links.map((link, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '7px 11px',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <Icon name="arrowUpRight" size={11} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: 'var(--text-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            Ref: <strong>{link.title}</strong>
                          </span>
                        </div>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mono"
                          style={{ fontSize: 10, color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600, flexShrink: 0 }}
                        >
                          Read Guide
                        </a>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* User avatar */}
            {m.role === 'me' && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--chat-user-bg), #E0A800)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  color: '#1A1A1A',
                  flexShrink: 0,
                  marginTop: 2,
                  boxShadow: '0 2px 6px rgba(255, 206, 0, 0.25)',
                }}
              >
                ME
              </div>
            )}
          </div>
        ))}

        {/* Thinking animation */}
        {thinking && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div className="msg-ai-avatar">
              <Icon name="sparkle" size={13} style={{ color: 'var(--primary)' }} />
            </div>
            <div
              className="msg-ai-bubble"
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'center',
                padding: '12px 16px',
              }}
            >
              {[0, 0.18, 0.36].map((delay, i) => (
                <i
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    background: 'var(--text-4)',
                    borderRadius: '50%',
                    animation: `bounce 1.4s infinite ease-in-out both`,
                    animationDelay: `${delay}s`,
                    display: 'block',
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Controls panel ──────────────────────────────────── */}
      <div style={{ padding: '10px 0 0 0', background: 'var(--chat-bg)' }}>

        {/* Suggestion chips */}
        {msgs.length <= 2 && !thinking && (
          <div className="chat-suggest">
            {[
              'Why was this flagged?',
              'Show map',
              'Check card history',
              'Any related devices?',
            ].map((q) => (
              <div key={q} className="suggest-chip" onClick={() => handleAsk(q)}>{q}</div>
            ))}
          </div>
        )}

        {/* Flanked Chat input form container — exactly like reference */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 16px 16px' }}>
          {/* Flank button 1: Attachment Paperclip */}
          <button
            type="button"
            className="chat-circle-btn"
            title="Attach dataset or document"
            onClick={() => {}}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>

          {/* Flank button 2: Microphone Voice */}
          <button
            type="button"
            className="chat-circle-btn"
            title="Voice triage record"
            onClick={() => {}}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1={12} x2={12} y1={19} y2={22} />
            </svg>
          </button>

          {/* Chat input bar — dark pill */}
          <form
            className="chat-input-bar"
            onSubmit={onSubmit}
          >
            <Icon name="search" size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask Gemini about ${activeTx.id}…`}
            />
            <button
              className="send-btn"
              type="submit"
              disabled={!input.trim()}
            >
              <Icon name="send" size={13} />
            </button>
          </form>
        </div>

        {/* Action buttons — 4 across */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            padding: '0 16px 12px',
          }}
        >
          <button
            className="act-btn danger"
            onClick={() => handleAction('block', activeTx)}
            title="Block Transaction (Ctrl+Shift+B)"
            style={{
              background: activeTx.status === 'blocked' ? 'var(--critical-bg)' : undefined,
              borderColor: activeTx.status === 'blocked' ? 'rgba(220,38,38,0.30)' : undefined,
              color: activeTx.status === 'blocked' ? 'var(--critical)' : undefined,
            }}
          >
            <Icon name="block" size={13} /> Block
          </button>
          <button
            className="act-btn ok"
            onClick={() => handleAction('clear', activeTx)}
            title="Approve Transaction (Ctrl+Shift+A)"
            style={{
              background: activeTx.status === 'cleared' ? 'var(--low-bg)' : undefined,
              borderColor: activeTx.status === 'cleared' ? 'rgba(22,163,74,0.30)' : undefined,
              color: activeTx.status === 'cleared' ? 'var(--low)' : undefined,
            }}
          >
            <Icon name="check" size={13} /> Approve
          </button>
          <button
            className="act-btn warn"
            onClick={onOpenEscalation}
            title="Escalate Transaction (Ctrl+Shift+E)"
            style={{
              background: activeTx.status === 'escalated' ? 'var(--high-bg)' : undefined,
              borderColor: activeTx.status === 'escalated' ? 'rgba(234,88,12,0.30)' : undefined,
              color: activeTx.status === 'escalated' ? 'var(--high)' : undefined,
            }}
          >
            <Icon name="escalate" size={13} /> Escalate
          </button>
          <button
            className="act-btn"
            onClick={() => handleAction('false_positive', activeTx)}
            title="Mark False Positive (Ctrl+Shift+F)"
            style={{
              background: activeTx.status === 'false_positive' ? 'var(--surface-hi)' : undefined,
            }}
          >
            <Icon name="close" size={13} /> FP Flag
          </button>
        </div>
      </div>
    </div>
  );
}
