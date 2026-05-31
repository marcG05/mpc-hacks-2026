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
    <div style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', overflow: 'hidden', padding: '10px 0 0 0' }}>
      
      {/* Scrollable messages area */}
      <div className="chat-msgs" ref={chatRef} style={{ overflowY: 'auto', padding: '0 4px 12px 4px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                whiteSpace: 'normal'
              }}
            >
              {parseMarkdown(m.text)}

              {/* Dynamic Reference / Reading Widget if AI refers to external/general knowledge */}
              {m.role === 'ai' && (() => {
                const links = parseMarkdownLinks(m.text);
                if (links.length === 0) return null;
                return (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {links.map((link, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        background: 'var(--surface-3)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <Icon name="arrowUpRight" size={11} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          <span style={{ fontSize: 10.5, color: 'var(--text-2)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            Ref: <strong>{link.title}</strong>
                          </span>
                        </div>
                        <a 
                          href={link.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="mono"
                          style={{ 
                            fontSize: 10, 
                            color: 'var(--accent)', 
                            textDecoration: 'underline',
                            fontWeight: 600,
                            flexShrink: 0
                          }}
                        >
                          Read Guide
                        </a>
                      </div>
                    ))}
                  </div>
                );
              })()}
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

      {/* Controls panel */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 4px 0 4px', background: 'var(--bg)' }}>
        
        {/* Suggestions */}
        {msgs.length <= 2 && !thinking && (
          <div className="chat-suggest" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            <div className="suggest-chip" onClick={() => handleAsk("Why was this flagged?")}>Why was this flagged?</div>
            <div className="suggest-chip" onClick={() => handleAsk("Show locations on map")}>Show map</div>
            <div className="suggest-chip" onClick={() => handleAsk("Compare to historical card baseline")}>Check card history</div>
            <div className="suggest-chip" onClick={() => handleAsk("Verify device or IP association")}>Any related devices?</div>
          </div>
        )}

        {/* Chat form */}
        <form className="chat-input" onSubmit={onSubmit} style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', marginBottom: 12 }}>
          <Icon name="sparkle" size={15} style={{ color: 'var(--text-3)', marginRight: 8 }} />
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={`Ask Copilot about ${activeTx.id}...`}
            style={{ flex: 1, background: 'transparent', border: 0, outline: 'none', color: 'var(--text)', fontSize: 13 }}
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

        {/* Action Buttons */}
        <div className="aip-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, paddingBottom: 6 }}>
          <button 
            className={`act-btn danger ${activeTx.status === 'blocked' ? 'active' : ''}`} 
            onClick={() => handleAction("block", activeTx)}
            style={{ opacity: activeTx.status === 'blocked' ? 1 : 0.8 }}
            title="Block Transaction (Alt+Shift+B)"
          >
            <Icon name="block" size={14} /> Block (Alt+Shift+B)
          </button>
          <button 
            className={`act-btn ok ${activeTx.status === 'cleared' ? 'active' : ''}`} 
            onClick={() => handleAction("clear", activeTx)}
            style={{ opacity: activeTx.status === 'cleared' ? 1 : 0.8 }}
            title="Approve Transaction (Alt+Shift+A)"
          >
            <Icon name="check" size={14} /> Approve (Alt+Shift+A)
          </button>
          <button 
            className={`act-btn warn ${activeTx.status === 'escalated' ? 'active' : ''}`} 
            onClick={onOpenEscalation}
            style={{ opacity: activeTx.status === 'escalated' ? 1 : 0.8 }}
            title="Escalate Transaction (Alt+Shift+E)"
          >
            <Icon name="escalate" size={14} /> Escalate (Alt+Shift+E)
          </button>
          <button 
            className={`act-btn ${activeTx.status === 'false_positive' ? 'active' : ''}`} 
            onClick={() => handleAction("false_positive", activeTx)}
            style={{ opacity: activeTx.status === 'false_positive' ? 1 : 0.8 }}
          >
            <Icon name="close" size={14} /> FP Flag
          </button>
        </div>

      </div>
    </div>
  );
}
