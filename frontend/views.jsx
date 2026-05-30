/* ============================================================
   Fraud Hunter — views: Dashboard, ReviewQueue, DecisionLog, Upload
   ============================================================ */
const { useState: useStateV, useMemo: useMemoV, useEffect: useEffectV } = React;

/* ---------------- DASHBOARD ---------------- */
function Dashboard({ txns, selectedId, onSelect }) {
  const [filter, setFilter] = useStateV("all");
  const [query, setQuery] = useStateV("");

  const counts = useMemoV(() => {
    const c = { all: txns.length, critical: 0, high: 0, review: 0, open: 0 };
    txns.forEach((t) => {
      const sev = FRAUD.sevOf(t.score);
      if (sev === "critical") c.critical++;
      if (sev === "high") c.high++;
      if (t.status === "review") c.review++;
      if (t.status === "flagged" || t.status === "review") c.open++;
    });
    return c;
  }, [txns]);

  const rows = useMemoV(() => {
    return txns.filter((t) => {
      if (filter === "critical" && FRAUD.sevOf(t.score) !== "critical") return false;
      if (filter === "high" && FRAUD.sevOf(t.score) !== "high") return false;
      if (filter === "review" && t.status !== "review") return false;
      if (query) {
        const q = query.toLowerCase();
        return (t.id + t.card + t.merchant + t.customer).toLowerCase().includes(q);
      }
      return true;
    });
  }, [txns, filter, query]);

  const atRisk = txns.filter((t) => t.status === "flagged" || t.status === "review")
    .reduce((s, t) => s + t.amount, 0);
  const confirmed = txns.filter((t) => t.status === "blocked" || t.status === "escalated").length;
  const fpRate = Math.round(txns.filter((t) => t.status === "false_positive").length / txns.length * 100);

  return (
    <div className="content">
      <div className="page-head flex between">
        <div>
          <h1 className="page-title">Flagged Transactions</h1>
          <div className="page-sub">Review and action transactions flagged by the detection engine</div>
        </div>
        <div className="toolbar">
          <button className="btn btn-ghost btn-sm"><Icon name="calendar" size={14} /> Last 24 hours</button>
          <button className="btn btn-primary btn-sm"><Icon name="check" size={14} /> Mark all reviewed</button>
        </div>
      </div>

      {/* metrics */}
      <div className="metrics">
        <MetricCard label="Flagged today" value={counts.open} icon="flag"
          delta="+8 (24h)" deltaDir="up" sparkColor="var(--critical)" sparkPct={72} />
        <MetricCard label="Amount at risk" value={FRAUD.money(atRisk).replace(".00", "")} icon="trend"
          delta="+12% (24h)" deltaDir="up" sparkColor="var(--high)" sparkPct={64} />
        <MetricCard label="Confirmed fraud" value={confirmed} icon="shield"
          delta="−3 (24h)" deltaDir="down" sparkColor="var(--violet)" sparkPct={38} />
        <MetricCard label="False-positive rate" value={fpRate + "%"} icon="check"
          delta="−2% (24h)" deltaDir="down" sparkColor="var(--low)" sparkPct={20} />
      </div>

      {/* main split */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 296px", gap: 16, alignItems: "start" }}>
        {/* table */}
        <div className="card table-wrap">
          <div className="flex between" style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)" }}>
            <div className="seg">
              {[["all", "All"], ["critical", "Critical"], ["high", "High"], ["review", "Under review"]].map(([k, l]) => (
                <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                  {l} <span style={{ opacity: 0.6 }}>{counts[k]}</span>
                </button>
              ))}
            </div>
            <div className="search" style={{ width: 220, padding: "6px 11px" }}>
              <Icon name="search" size={14} />
              <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Risk</th><th>Transaction</th><th>Amount</th><th>Merchant</th>
                <th>Type</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className={selectedId === t.id ? "selected" : ""} onClick={() => onSelect(t)}>
                  <td><ScoreBar score={t.score} /></td>
                  <td>
                    <div className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{t.id}</div>
                    <div className="mono" style={{ color: "var(--text-3)", fontSize: 11 }}>{t.card}</div>
                  </td>
                  <td className="mono" style={{ fontWeight: 600 }}>{FRAUD.money(t.amount)}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{t.merchant}</div>
                    <div style={{ color: "var(--text-3)", fontSize: 11.5 }}>{t.customer}</div>
                  </td>
                  <td style={{ color: "var(--text-2)", fontSize: 12.5 }}>{FRAUD.FRAUD_TYPES[t.type]}</td>
                  <td><StatusPill status={t.status} /></td>
                  <td>
                    <div className="icon-btn" style={{ width: 28, height: 28 }} title="Open AI analyst">
                      <Icon name="sparkle" size={15} style={{ color: "var(--accent)" }} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan="7"><div className="empty-hint">No transactions match this filter.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* right rail */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 17 }}>
            <div className="sec-label" style={{ marginBottom: 16 }}><Icon name="layers" size={13} /> Fraud by type</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <Donut data={FRAUD.BY_TYPE} size={132} thickness={16} />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 23, fontWeight: 700 }}>73</div>
                    <div style={{ fontSize: 9.5, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>flagged</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 14px" }}>
              {FRAUD.BY_TYPE.map((d, i) => (
                <div className="legend-row" key={i}>
                  <span className="legend-dot" style={{ background: d.color }}></span>
                  <span style={{ color: "var(--text-2)", fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</span>
                  <span className="legend-val" style={{ fontSize: 11.5 }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 17 }}>
            <div className="sec-label" style={{ marginBottom: 13 }}><Icon name="pulse" size={13} /> Top signals (24h)</div>
            {[
              ["Shared IP address", 34, "var(--critical)"],
              ["Amount anomaly", 28, "var(--high)"],
              ["Unrecognized device", 22, "var(--critical)"],
              ["Geographic mismatch", 19, "var(--high)"],
              ["Card-testing pattern", 11, "var(--critical)"],
            ].map(([name, pct, c], i) => (
              <div className="brk-row" key={i} style={{ marginBottom: 11 }}>
                <div className="brk-name" style={{ width: 130 }}>{name}</div>
                <div className="brk-bar"><i style={{ width: pct + "%", background: c }}></i></div>
                <div className="brk-val">{pct}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 17 }}>
            <div className="sec-label" style={{ marginBottom: 12 }}><Icon name="info" size={13} /> Model</div>
            <div className="flex between" style={{ marginBottom: 9 }}>
              <span style={{ color: "var(--text-2)", fontSize: 12.5 }}>F1 score</span>
              <span className="mono" style={{ fontWeight: 700, color: "var(--low)" }}>0.87</span>
            </div>
            <div className="flex between" style={{ marginBottom: 9 }}>
              <span style={{ color: "var(--text-2)", fontSize: 12.5 }}>Precision</span>
              <span className="mono" style={{ fontWeight: 600 }}>0.84</span>
            </div>
            <div className="flex between">
              <span style={{ color: "var(--text-2)", fontSize: 12.5 }}>Recall</span>
              <span className="mono" style={{ fontWeight: 600 }}>0.91</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- REVIEW QUEUE ---------------- */
function ReviewQueue({ txns, onAction, onOpenPanel }) {
  const queue = useMemoV(() => txns.filter((t) => t.status === "flagged" || t.status === "review"), [txns]);
  const [idx, setIdx] = useStateV(0);
  const [done, setDone] = useStateV(0);
  const safeIdx = Math.min(idx, Math.max(0, queue.length - 1));
  const tx = queue[safeIdx];

  function act(action) {
    if (!tx) return;
    onAction(action, tx);
    setDone((d) => d + 1);
    // stay at same index — list shrinks, next item slides up
    setIdx((i) => Math.min(i, queue.length - 2 < 0 ? 0 : queue.length - 2));
  }

  useEffectV(() => {
    function onKey(e) {
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
  const sevColor = SEV_STYLE[sev].c;

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

/* ---------------- DECISION LOG ---------------- */
const ACTION_META = {
  block:          { label: "Blocked",        c: "var(--critical)", icon: "block" },
  clear:          { label: "Approved",       c: "var(--low)",      icon: "check" },
  escalate:       { label: "Escalated",      c: "var(--violet)",   icon: "escalate" },
  false_positive: { label: "False positive", c: "var(--text-2)",   icon: "flag" },
};
function DecisionLog({ log }) {
  return (
    <div className="content">
      <div className="page-head flex between">
        <div>
          <h1 className="page-title">Decision Log</h1>
          <div className="page-sub">Full audit trail of reviewer decisions · {log.length} entries</div>
        </div>
        <button className="btn btn-ghost btn-sm"><Icon name="upload" size={14} style={{ transform: "rotate(180deg)" }} /> Export CSV</button>
      </div>
      <div className="card table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Time</th><th>Transaction</th><th>Card</th><th>Action</th><th>Score</th><th>Reviewer</th></tr>
          </thead>
          <tbody>
            {log.length === 0 && <tr><td colSpan="6"><div className="empty-hint">No decisions logged yet — action a transaction to see it here.</div></td></tr>}
            {log.map((e, i) => {
              const m = ACTION_META[e.action];
              return (
                <tr key={i} style={{ cursor: "default" }}>
                  <td className="mono" style={{ color: "var(--text-3)", fontSize: 12 }}>{e.time}</td>
                  <td className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{e.tx}</td>
                  <td className="mono" style={{ color: "var(--text-2)", fontSize: 12.5 }}>{e.card}</td>
                  <td>
                    <span className="sev-tag" style={{ color: m.c }}><Icon name={m.icon} size={14} /> {m.label}</span>
                  </td>
                  <td><span className="mono" style={{ color: SEV_STYLE[FRAUD.sevOf(e.score)].c, fontWeight: 600 }}>{e.score.toFixed(2)}</span></td>
                  <td style={{ color: "var(--text-2)", fontSize: 12.5 }}>{e.by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- UPLOAD ---------------- */
function Upload({ onAnalyze }) {
  const [drag, setDrag] = useStateV(false);
  const [running, setRunning] = useStateV(false);
  const [step, setStep] = useStateV(0);
  const STEPS = ["Parsing transactions.csv…", "Building per-card baselines…", "Detecting cross-card signals…", "Scoring & tuning threshold…"];

  function run() {
    setRunning(true); setStep(0);
    let s = 0;
    const iv = setInterval(() => {
      s++; setStep(s);
      if (s >= STEPS.length) { clearInterval(iv); setTimeout(onAnalyze, 500); }
    }, 650);
  }

  return (
    <div className="content">
      <div className="upload-stage">
        {!running ? (
          <div>
            <div className={"dropzone" + (drag ? " drag" : "")}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); run(); }}
              onClick={run}>
              <div style={{ width: 56, height: 56, margin: "0 auto 18px", borderRadius: 14, background: "var(--accent-soft)", border: "1px solid var(--accent-line)", display: "grid", placeItems: "center" }}>
                <Icon name="upload" size={26} style={{ color: "var(--accent)" }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Drop transactions.csv</div>
              <div style={{ color: "var(--text-3)", marginTop: 6, fontSize: 13 }}>or click to browse · CSV up to 50 MB</div>
            </div>
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button className="btn btn-primary" onClick={run}><Icon name="pulse" size={15} /> Run analysis</button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ width: 460, padding: 28 }}>
            <div className="sec-label" style={{ marginBottom: 18 }}><Icon name="pulse" size={13} /> Detection pipeline</div>
            {STEPS.map((s, i) => (
              <div className="flex" key={i} style={{ alignItems: "center", gap: 11, padding: "8px 0", opacity: i <= step ? 1 : 0.35 }}>
                <div style={{ width: 22, height: 22, borderRadius: 99, display: "grid", placeItems: "center",
                  background: i < step ? "var(--low-bg)" : i === step ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                  border: "1px solid " + (i < step ? "rgba(56,192,138,0.3)" : "var(--border)") }}>
                  {i < step ? <Icon name="check" size={13} style={{ color: "var(--low)" }} />
                    : i === step ? <div className="typing-dots" style={{ transform: "scale(0.6)" }}><i></i><i></i><i></i></div>
                    : <span style={{ color: "var(--text-4)", fontSize: 11 }}>{i + 1}</span>}
                </div>
                <span style={{ fontSize: 13, color: i <= step ? "var(--text)" : "var(--text-3)" }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, ReviewQueue, DecisionLog, Upload });
