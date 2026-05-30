import { useState, useEffect, useRef } from 'react';
import { FRAUD } from '../../data';
import { Icon, SevTag, Sparkline, sigColorVar, sigBgVar, SEV_STYLE } from '../../components';
import type { Transaction } from '../../types';

/* ---- Build the AI's primary explanation for a transaction ---- */
function buildExplanation(tx: Transaction | null): string {
  if (!tx) return "";
  const top = tx.signals.slice(0, 3).map((s) => s.name.toLowerCase());
  const sev = FRAUD.sevLabel(tx.score).toLowerCase();
  return (
    `${tx.id} scored ${tx.score.toFixed(2)} — ${sev} risk. ` +
    `The strongest drivers are ${joinList(top)}. ` +
    `${tx.signals[0].detail} ` +
    `Given the ${((FRAUD.FRAUD_TYPES[tx.type] ?? tx.type) || 'unknown').toLowerCase()} pattern on ${tx.card}, I'd recommend ` +
    `${tx.score >= 0.8 ? "blocking and escalating for manual review" : tx.score >= 0.6 ? "holding the charge pending verification" : "a light-touch step-up authentication"}.`
  );
}

function joinList(arr: string[]): string {
  if (arr.length <= 1) return arr[0] || "";
  return arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1];
}

/* ---- Score breakdown rows from signals ---- */
function breakdownFor(tx: Transaction) {
  return tx.signals
    .map((s) => ({ name: s.name, val: s.weight, color: sigColorVar(s.color) }))
    .sort((a, b) => b.val - a.val);
}

/* ---- Mocked-but-contextual chat answer ---- */
function mockAnswer(tx: Transaction, q: string): string {
  const ql = q.toLowerCase();
  const M = FRAUD.money;
  if (/why|flag|reason|score/.test(ql)) {
    return `${tx.id} was flagged because ${tx.signals.length} independent signals fired at once. ` +
      tx.signals.map((s) => "• " + s.detail).join("\n") +
      `\n\nIndividually any one of these might be tolerable, but together they push the composite score to ${tx.score.toFixed(2)}.`;
  }
  if (/card|history|baseline|median|normal/.test(ql)) {
    return `On ${tx.card}, the median transaction is ${M(tx.cardMedian)} and the card normally operates between 08:00–22:00 local. ` +
      `This charge of ${M(tx.amount)} sits well outside that envelope. The sparkline shows the last 22 transactions were tightly clustered before this spike.`;
  }
  if (/device|ip|shared|linked|related|other/.test(ql)) {
    const dev = tx.signals.find((s) => /device|ip/.test(s.key));
    return dev
      ? `Yes — ${dev.detail} This kind of fan-out across multiple cards is a strong device-farm / account-takeover indicator. I'd check the other cards on ${tx.ip} before clearing anything.`
      : `No shared-device or shared-IP signal fired on ${tx.id}. The risk here is driven by ${tx.signals[0].name.toLowerCase()} rather than infrastructure reuse.`;
  }
  if (/recommend|action|should|do|block|approve/.test(ql)) {
    const rec = tx.score >= 0.8 ? "Block + escalate" : tx.score >= 0.6 ? "Hold for verification" : "Step-up auth";
    return `Recommendation: ${rec}.\n\nAt a score of ${tx.score.toFixed(2)} the expected loss from a false-negative outweighs the friction cost of a challenge. If you block, I can auto-draft the customer notification and freeze ${tx.card}.`;
  }
  if (/amount|how much|value|loss|risk/.test(ql)) {
    return `The exposure on this single charge is ${M(tx.amount)}. Across ${tx.card}'s recent activity in this session, total at-risk value is approximately ${M(tx.amount * 1.6)}. This card has no chargeback history in the last 12 months.`;
  }
  // fallback
  return `Looking at ${tx.id}: it's a ${M(tx.amount)} ${tx.channel.toLowerCase()} charge at ${tx.merchant}, scored ${tx.score.toFixed(2)} (${FRAUD.sevLabel(tx.score)}). ` +
    `The dominant signal is ${tx.signals[0].name.toLowerCase()} — ${tx.signals[0].detail} Ask me about the card's history, shared devices, or what action to take.`;
}

const SUGGESTIONS = [
  "Why was this flagged?",
  "Any related transactions?",
  "What should I do?",
  "How does this compare to the card's history?",
];

interface AIPanelProps {
  tx: Transaction | null;
  open: boolean;
  onClose: () => void;
  onAction: (action: string, tx: Transaction) => void;
}

export function AIPanel({ tx, open, onClose, onAction }: AIPanelProps) {
  const [explain, setExplain] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [msgs, setMsgs] = useState<{role: string, text: string}[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const txid = tx ? tx.id : null;

  // Stream the explanation in when a new tx is opened
  useEffect(() => {
    if (!tx) return;
    setMsgs([]);
    setInput("");
    const full = buildExplanation(tx);
    setExplain("");
    setExplaining(true);
    let i = 0;
    const iv = setInterval(() => {
      i += 3;
      setExplain(full.slice(0, i));
      if (i >= full.length) { clearInterval(iv); setExplaining(false); }
    }, 12);
    return () => clearInterval(iv);
  }, [txid, tx]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [msgs, thinking]);

  function ask(q: string) {
    if (!q.trim() || !tx) return;
    setMsgs((m) => [...m, { role: "me", text: q }]);
    setInput("");
    setThinking(true);
    const answer = mockAnswer(tx, q);
    setTimeout(() => {
      setThinking(false);
      // stream the answer
      setMsgs((m) => [...m, { role: "ai", text: "" }]);
      let i = 0;
      const iv = setInterval(() => {
        i += 4;
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "ai", text: answer.slice(0, i) };
          return c;
        });
        if (i >= answer.length) clearInterval(iv);
      }, 12);
    }, 750);
  }

  if (!tx) return <div className={"ai-panel" + (open ? " show" : "")}></div>;

  const brk = breakdownFor(tx);
  const sevKey = FRAUD.sevOf(tx.score);
  const sevStyle = SEV_STYLE[sevKey] || SEV_STYLE.low;

  return (
    <>
      <div className={"panel-scrim" + (open ? " show" : "")} onClick={onClose}></div>
      <aside className={"ai-panel" + (open ? " show" : "")}>
        <div className="aip-head">
          <div className="aip-spark"><Icon name="sparkle" size={17} style={{ color: "var(--accent-hi)" }} /></div>
          <div style={{ flex: 1 }}>
            <div className="aip-title">Fraud Analyst</div>
            <div className="aip-sub">AI assessment · {tx.id}</div>
          </div>
          <div className="icon-btn" onClick={onClose}><Icon name="close" size={18} /></div>
        </div>

        <div className="aip-body" ref={bodyRef}>
          {/* Transaction summary */}
          <div className="aip-txn">
            <div className="flex between" style={{ alignItems: "flex-start" }}>
              <div>
                <div className="aip-amount">{FRAUD.money(tx.amount)}</div>
                <div className="aip-merchant">{tx.merchant} · {tx.category}</div>
              </div>
              <SevTag score={tx.score} />
            </div>
            <div className="aip-meta-grid">
              <div><div className="aip-meta-k">Card</div><div className="aip-meta-v mono">{tx.card}</div></div>
              <div><div className="aip-meta-k">Customer</div><div className="aip-meta-v">{tx.customer}</div></div>
              <div><div className="aip-meta-k">Channel</div><div className="aip-meta-v">{tx.channel}</div></div>
              <div><div className="aip-meta-k">Time</div><div className="aip-meta-v mono" style={{ fontSize: 11.5 }}>{tx.time}</div></div>
              <div><div className="aip-meta-k">Device</div><div className="aip-meta-v mono" style={{ fontSize: 11.5 }}>{tx.device}</div></div>
              <div><div className="aip-meta-k">IP</div><div className="aip-meta-v mono" style={{ fontSize: 11.5 }}>{tx.ip}</div></div>
            </div>
          </div>

          {/* AI explanation */}
          <div>
            <div className="sec-label"><Icon name="sparkle" size={13} /> AI Assessment</div>
            <div className="ai-explain">
              {explain}
              {explaining && <span className="cursor"></span>}
            </div>
          </div>

          {/* Risk signals */}
          <div>
            <div className="sec-label"><Icon name="pulse" size={13} /> Triggered Signals · {tx.signals.length}</div>
            <div>
              {tx.signals.map((s, i) => (
                <div className="signal" key={i}>
                  <div className="signal-ico" style={{ background: sigBgVar(s.color), color: sigColorVar(s.color) }}>
                    <Icon name={s.icon} size={14} />
                  </div>
                  <div className="signal-txt">
                    <div className="signal-name">{s.name}</div>
                    <div className="signal-detail">{s.detail}</div>
                  </div>
                  <div className="signal-w">+{s.weight.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Score breakdown */}
          <div>
            <div className="sec-label"><Icon name="trend" size={13} /> Score Contribution</div>
            {brk.map((b, i) => (
              <div className="brk-row" key={i}>
                <div className="brk-name">{b.name}</div>
                <div className="brk-bar"><i style={{ width: Math.min(100, b.val / 0.25 * 100) + "%", background: b.color }}></i></div>
                <div className="brk-val">{b.val.toFixed(2)}</div>
              </div>
            ))}
          </div>

          {/* Card history */}
          <div>
            <div className="sec-label"><Icon name="history" size={13} /> {tx.card} · last 22 txns</div>
            <div className="card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 16 }}>
              <Sparkline data={tx.history} w={260} h={42} color={sevStyle.c} />
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div className="aip-meta-k">Median</div>
                <div className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{FRAUD.money(tx.cardMedian)}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="sec-label"><Icon name="shield" size={13} /> Decision</div>
            <div className="aip-actions">
              <button className="act-btn danger" onClick={() => onAction("block", tx)}><Icon name="block" size={15} /> Block</button>
              <button className="act-btn ok" onClick={() => onAction("clear", tx)}><Icon name="check" size={15} /> Approve</button>
              <button className="act-btn warn" onClick={() => onAction("escalate", tx)}><Icon name="escalate" size={15} /> Escalate</button>
              <button className="act-btn" onClick={() => onAction("false_positive", tx)}><Icon name="flag" size={15} /> False positive</button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="aip-chat">
          {(msgs.length > 0 || thinking) && (
            <div className="chat-msgs" ref={chatRef}>
              {msgs.map((m, i) => (
                <div className={"msg" + (m.role === "me" ? " me" : "")} key={i}>
                  <div className={"msg-ava " + (m.role === "me" ? "user" : "ai")}>
                    {m.role === "me" ? "LM" : <Icon name="sparkle" size={12} style={{ color: "var(--accent-hi)" }} />}
                  </div>
                  <div className="msg-bubble" style={{ whiteSpace: "pre-wrap" }}>{m.text || <span className="cursor"></span>}</div>
                </div>
              ))}
              {thinking && (
                <div className="msg">
                  <div className="msg-ava ai"><Icon name="sparkle" size={12} style={{ color: "var(--accent-hi)" }} /></div>
                  <div className="typing-dots"><i></i><i></i><i></i></div>
                </div>
              )}
            </div>
          )}
          {msgs.length === 0 && !thinking && (
            <div className="chat-suggest">
              {SUGGESTIONS.map((s, i) => (
                <div className="suggest-chip" key={i} onClick={() => ask(s)}>{s}</div>
              ))}
            </div>
          )}
          <form className="chat-input" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
            <Icon name="sparkle" size={15} style={{ color: "var(--text-3)" }} />
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Ask about ${tx.id}…`} />
            <button className="send-btn" type="submit" disabled={!input.trim()}><Icon name="send" size={14} /></button>
          </form>
        </div>
      </aside>
    </>
  );
}
