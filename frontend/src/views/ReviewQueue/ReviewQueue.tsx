import { useState, useMemo, useEffect } from 'react';
import { FRAUD } from '../../data';
import { Icon, SevTag, Sparkline, sigBgVar, sigColorVar, SEV_STYLE } from '../../components';
import type { Transaction } from '../../types';

interface ReviewQueueProps {
  txns: Transaction[];
  onAction: (action: string, tx: Transaction) => void;
  onOpenPanel: (tx: Transaction) => void;
}

export function ReviewQueue({ txns, onAction, onOpenPanel }: ReviewQueueProps) {
  const queue = useMemo(() => txns.filter((t) => t.status === "flagged" || t.status === "review"), [txns]);
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(0);
  const safeIdx = Math.min(idx, Math.max(0, queue.length - 1));
  const tx = queue[safeIdx];

  function act(action: string) {
    if (!tx) return;
    onAction(action, tx);
    setDone((d) => d + 1);
    // stay at same index — list shrinks, next item slides up
    setIdx((i) => Math.min(i, queue.length - 2 < 0 ? 0 : queue.length - 2));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!tx) return;
      const k = e.key.toLowerCase();
      if (k === "a") act("clear");
      else if (k === "d") act("block");
      else if (k === "e") act("escalate");
      else if (k === "arrowright" || k === "j") setIdx((i) => Math.min(i + 1, queue.length - 1));
      else if (k === "arrowleft" || k === "k") setIdx((i) => Math.max(i - 1, 0));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tx, queue.length]);

  if (!tx) {
    return (
      <div className="content">
        <div className="page-head"><h1 className="page-title">Review Queue</h1></div>
        <div className="card empty-hint" style={{ maxWidth: 720, margin: "40px auto" }}>
          <Icon name="check" size={32} style={{ color: "var(--low)" }} />
          <div style={{ marginTop: 12, fontSize: 15, color: "var(--text)" }}>Queue cleared</div>
          <div style={{ marginTop: 4 }}>You've reviewed every flagged transaction. {done} decisions logged.</div>
        </div>
      </div>
    );
  }

  const sev = FRAUD.sevOf(tx.score);
  const sevColor = SEV_STYLE[sev]?.c || "var(--low)";

  return (
    <div className="content">
      <div className="page-head">
        <h1 className="page-title">Review Queue</h1>
        <div className="page-sub">One transaction at a time · use <span className="kbd">A</span> approve <span className="kbd">D</span> block <span className="kbd">E</span> escalate <span className="kbd">←/→</span> navigate</div>
      </div>

      <div className="rq-stage">
        <div className="card rq-card fade-in" key={tx.id}>
          <div className="rq-head">
            <div className="rq-sevbar" style={{ background: sevColor }}></div>
            <div style={{ flex: 1 }}>
              <div className="flex" style={{ alignItems: "center", gap: 10 }}>
                <span className="mono" style={{ fontSize: 15, fontWeight: 700 }}>{tx.id}</span>
                <SevTag score={tx.score} />
                <span className="mono" style={{ color: "var(--text-3)", fontSize: 12 }}>{tx.card}</span>
              </div>
              <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 3 }}>{tx.merchant} · {tx.customer} · {tx.time}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="aip-amount" style={{ fontSize: 24 }}>{FRAUD.money(tx.amount)}</div>
              <div className="mono" style={{ fontSize: 12, color: sevColor }}>score {tx.score.toFixed(2)}</div>
            </div>
          </div>
          <div className="rq-body">
            <div className="sec-label"><Icon name="pulse" size={13} /> Why it's flagged</div>
            {tx.signals.map((s, i) => (
              <div className="signal" key={i}>
                <div className="signal-ico" style={{ background: sigBgVar(s.color), color: sigColorVar(s.color) }}>
                  <Icon name={s.icon} size={14} />
                </div>
                <div className="signal-txt">
                  <div className="signal-name">{s.name}</div>
                  <div className="signal-detail">{s.detail}</div>
                </div>
              </div>
            ))}

            <div className="card" style={{ padding: "13px 16px", margin: "16px 0 18px", display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <div className="aip-meta-k">Card history · last 22</div>
                <div style={{ marginTop: 6 }}><Sparkline data={tx.history} w={300} h={40} color={sevColor} /></div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div className="aip-meta-k">Median</div>
                <div className="mono" style={{ fontSize: 15, fontWeight: 600 }}>{FRAUD.money(tx.cardMedian)}</div>
              </div>
            </div>

            <div className="flex" style={{ gap: 9 }}>
              <button className="btn btn-ok" style={{ flex: 1 }} onClick={() => act("clear")}><Icon name="check" size={15} /> Approve <span className="kbd" style={{ marginLeft: 4 }}>A</span></button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => act("block")}><Icon name="block" size={15} /> Block <span className="kbd" style={{ marginLeft: 4 }}>D</span></button>
              <button className="btn" style={{ flex: 1 }} onClick={() => act("escalate")}><Icon name="escalate" size={15} /> Escalate <span className="kbd" style={{ marginLeft: 4 }}>E</span></button>
              <button className="btn btn-ghost" onClick={() => onOpenPanel(tx)}><Icon name="sparkle" size={15} style={{ color: "var(--accent)" }} /> Ask AI</button>
            </div>
          </div>
        </div>
        <div className="rq-progress"><b>{queue.length}</b> remaining · <b>{done}</b> reviewed this session</div>
      </div>
    </div>
  );
}
