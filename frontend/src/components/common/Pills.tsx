import { FRAUD } from '../../data';

/* ---------- Severity / status pills ---------- */
export const SEV_STYLE: Record<string, { c: string, bg: string, b: string }> = {
  critical: { c: "var(--critical)", bg: "var(--critical-bg)", b: "rgba(240,97,109,0.3)" },
  high:     { c: "var(--high)",     bg: "var(--high-bg)",     b: "rgba(233,138,69,0.3)" },
  medium:   { c: "var(--medium)",   bg: "var(--medium-bg)",   b: "rgba(227,189,78,0.3)" },
  low:      { c: "var(--low)",      bg: "var(--low-bg)",      b: "rgba(56,192,138,0.3)" },
};

export function SevTag({ score }: { score: number }) {
  const sev = FRAUD.sevOf(score);
  const s = SEV_STYLE[sev] || SEV_STYLE.low;
  return (
    <span className="pill" style={{ color: s.c, background: s.bg, borderColor: s.b }}>
      <span className="dot" style={{ background: s.c }}></span>
      {FRAUD.sevLabel(score)}
    </span>
  );
}

export const STATUS_STYLE: Record<string, { c: string, bg: string, b: string, label: string }> = {
  flagged:        { c: "var(--critical)", bg: "var(--critical-bg)", b: "rgba(240,97,109,0.3)", label: "Flagged" },
  review:         { c: "var(--accent)",   bg: "var(--accent-soft)", b: "rgba(77,139,240,0.3)", label: "Under Review" },
  blocked:        { c: "var(--high)",     bg: "var(--high-bg)",     b: "rgba(233,138,69,0.3)", label: "Blocked" },
  cleared:        { c: "var(--low)",      bg: "var(--low-bg)",      b: "rgba(56,192,138,0.3)", label: "Cleared" },
  escalated:      { c: "var(--violet)",   bg: "var(--violet-bg)",   b: "rgba(167,139,250,0.3)", label: "Escalated" },
  false_positive: { c: "var(--text-2)",   bg: "rgba(255,255,255,0.06)", b: "var(--border-2)", label: "False Positive" },
};

export function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.flagged;
  return (
    <span className="pill" style={{ color: s.c, background: s.bg, borderColor: s.b }}>
      <span className="dot" style={{ background: s.c }}></span>{s.label}
    </span>
  );
}
