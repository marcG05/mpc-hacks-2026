/* ============================================================
   Fraud Hunter — shared UI components + icon set
   Exports to window for cross-script use.
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---------- Icon set (simple line icons) ---------- */
function Icon({ name, size = 16, stroke = 1.8, className = "", style = {} }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round",
    strokeLinejoin: "round", className, style };
  const paths = {
    shield: <><path d="M12 3l7 3v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"/></>,
    grid:   <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
    list:   <><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></>,
    layers: <><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/></>,
    upload: <><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></>,
    bell:   <><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></>,
    refresh:<><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></>,
    filter: <><path d="M3 5h18l-7 8v6l-4-2v-4L3 5z"/></>,
    calendar:<><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></>,
    sparkle:<><path d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6L12 3z"/><path d="M19 14l.7 2 .3 0 1.3.7-1.3.7-.7 2-.7-2-1.3-.7 1.3-.7z" opacity=".7"/></>,
    trend:  <><path d="M3 17l6-6 4 4 7-7"/><path d="M17 7h4v4"/></>,
    device: <><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/></>,
    network:<><circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="19" r="2.2"/><circle cx="19" cy="19" r="2.2"/><path d="M12 7.2v4M10.2 17.2L6.6 9M13.8 17.2L17.4 9"/></>,
    tag:    <><path d="M3 11l8-8 9 9-8 8-9-9z"/><circle cx="8" cy="8" r="1.3"/></>,
    globe:  <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></>,
    bolt:   <><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></>,
    probe:  <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    clock:  <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    swap:   <><path d="M7 10l-3 3 3 3M4 13h12M17 14l3-3-3-3M20 11H8"/></>,
    arrowUp:<><path d="M12 19V5M5 12l7-7 7 7"/></>,
    arrowDown:<><path d="M12 5v14M5 12l7 7 7-7"/></>,
    arrowRight:<><path d="M5 12h14M13 6l6 6-6 6"/></>,
    arrowUpRight:<><path d="M7 17L17 7M8 7h9v9"/></>,
    close:  <><path d="M18 6L6 18M6 6l12 12"/></>,
    send:   <><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></>,
    block:  <><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></>,
    check:  <><path d="M20 6L9 17l-5-5"/></>,
    escalate:<><path d="M12 19V6M6 12l6-6 6 6"/></>,
    flag:   <><path d="M4 21V4M4 4h13l-2 4 2 4H4"/></>,
    note:   <><path d="M4 4h16v12l-4 4H4z"/><path d="M16 20v-4h4"/></>,
    freeze: <><path d="M12 2v20M4 7l16 10M20 7L4 17M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3"/></>,
    chevron:<><path d="M9 6l6 6-6 6"/></>,
    dot:    <><circle cx="12" cy="12" r="3"/></>,
    user:   <><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></>,
    history:<><path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.3M3 4v3.5h3.5"/><path d="M12 7v5l3 2"/></>,
    info:   <><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></>,
    pulse:  <><path d="M3 12h4l2 6 4-14 2 8h6"/></>,
    panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
  };
  return <svg {...p}>{paths[name] || paths.dot}</svg>;
}

/* ---------- Severity / status pills ---------- */
const SEV_STYLE = {
  critical: { c: "var(--critical)", bg: "var(--critical-bg)", b: "rgba(240,97,109,0.3)" },
  high:     { c: "var(--high)",     bg: "var(--high-bg)",     b: "rgba(233,138,69,0.3)" },
  medium:   { c: "var(--medium)",   bg: "var(--medium-bg)",   b: "rgba(227,189,78,0.3)" },
  low:      { c: "var(--low)",      bg: "var(--low-bg)",      b: "rgba(56,192,138,0.3)" },
};
function SevTag({ score }) {
  const sev = FRAUD.sevOf(score);
  const s = SEV_STYLE[sev];
  return (
    <span className="pill" style={{ color: s.c, background: s.bg, borderColor: s.b }}>
      <span className="dot" style={{ background: s.c }}></span>
      {FRAUD.sevLabel(score)}
    </span>
  );
}

const STATUS_STYLE = {
  flagged:        { c: "var(--critical)", bg: "var(--critical-bg)", b: "rgba(240,97,109,0.3)", label: "Flagged" },
  review:         { c: "var(--accent)",   bg: "var(--accent-soft)", b: "rgba(77,139,240,0.3)", label: "Under Review" },
  blocked:        { c: "var(--high)",     bg: "var(--high-bg)",     b: "rgba(233,138,69,0.3)", label: "Blocked" },
  cleared:        { c: "var(--low)",      bg: "var(--low-bg)",      b: "rgba(56,192,138,0.3)", label: "Cleared" },
  escalated:      { c: "var(--violet)",   bg: "var(--violet-bg)",   b: "rgba(167,139,250,0.3)", label: "Escalated" },
  false_positive: { c: "var(--text-2)",   bg: "rgba(255,255,255,0.06)", b: "var(--border-2)", label: "False Positive" },
};
function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.flagged;
  return (
    <span className="pill" style={{ color: s.c, background: s.bg, borderColor: s.b }}>
      <span className="dot" style={{ background: s.c }}></span>{s.label}
    </span>
  );
}

/* ---------- Sparkline ---------- */
function Sparkline({ data, w = 120, h = 34, color = "var(--accent)" }) {
  const max = Math.max(...data), min = Math.min(...data);
  const rng = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / rng) * (h - 4) - 2]);
  const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  const last = pts[pts.length - 1];
  const gid = "sg" + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

/* ---------- Donut chart ---------- */
function Donut({ data, size = 150, thickness = 18 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = (d.value / total) * circ;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={d.color}
            strokeWidth={thickness} strokeDasharray={`${len} ${circ - len}`}
            strokeDashoffset={-offset} strokeLinecap="butt" />
        );
        offset += len;
        return seg;
      })}
    </svg>
  );
}

/* ---------- Metric card ---------- */
function MetricCard({ label, value, icon, delta, deltaDir, sparkColor, sparkPct }) {
  return (
    <div className="card metric fade-in">
      <div className="metric-label">
        <Icon name={icon} size={14} style={{ color: "var(--text-3)" }} />
        {label}
      </div>
      <div className="metric-row">
        <div className="metric-val">{value}</div>
        {delta && (
          <div className={"metric-delta " + (deltaDir === "up" ? "delta-up" : "delta-down")}>
            <Icon name={deltaDir === "up" ? "arrowUp" : "arrowDown"} size={12} />
            {delta}
          </div>
        )}
      </div>
      <div className="metric-spark">
        <i style={{ width: (sparkPct || 60) + "%", background: sparkColor || "var(--accent)" }}></i>
      </div>
    </div>
  );
}

/* ---------- Score bar (inline) ---------- */
function ScoreBar({ score }) {
  const sev = FRAUD.sevOf(score);
  const c = SEV_STYLE[sev].c;
  return (
    <div className="score-cell">
      <div className="score-bar"><i style={{ width: score * 100 + "%", background: c }}></i></div>
      <span className="score-num" style={{ color: c }}>{score.toFixed(2)}</span>
    </div>
  );
}

/* ---------- Signal-color → css var ---------- */
function sigColorVar(color) {
  return { critical: "var(--critical)", high: "var(--high)", medium: "var(--medium)", low: "var(--low)" }[color] || "var(--accent)";
}
function sigBgVar(color) {
  return { critical: "var(--critical-bg)", high: "var(--high-bg)", medium: "var(--medium-bg)", low: "var(--low-bg)" }[color] || "var(--accent-soft)";
}

Object.assign(window, {
  Icon, SevTag, StatusPill, Sparkline, Donut, MetricCard, ScoreBar,
  SEV_STYLE, STATUS_STYLE, sigColorVar, sigBgVar,
});
