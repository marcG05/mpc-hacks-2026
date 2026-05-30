import { FRAUD } from '../../data';
import { Icon, SEV_STYLE } from '../../components';
import type { LogEntry } from '../../types';

const ACTION_META: Record<string, {label: string, c: string, icon: string}> = {
  block:          { label: "Blocked",        c: "var(--critical)", icon: "block" },
  clear:          { label: "Approved",       c: "var(--low)",      icon: "check" },
  escalate:       { label: "Escalated",      c: "var(--violet)",   icon: "escalate" },
  false_positive: { label: "False positive", c: "var(--text-2)",   icon: "flag" },
};

interface DecisionLogProps {
  log: LogEntry[];
}

export function DecisionLog({ log }: DecisionLogProps) {
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
            {log.length === 0 && <tr><td colSpan={6}><div className="empty-hint">No decisions logged yet — action a transaction to see it here.</div></td></tr>}
            {log.map((e, i) => {
              const m = ACTION_META[e.action] || ACTION_META.false_positive;
              return (
                <tr key={i} style={{ cursor: "default" }}>
                  <td className="mono" style={{ color: "var(--text-3)", fontSize: 12 }}>{e.time}</td>
                  <td className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{e.tx}</td>
                  <td className="mono" style={{ color: "var(--text-2)", fontSize: 12.5 }}>{e.card}</td>
                  <td>
                    <span className="sev-tag" style={{ color: m.c }}><Icon name={m.icon} size={14} /> {m.label}</span>
                  </td>
                  <td><span className="mono" style={{ color: SEV_STYLE[FRAUD.sevOf(e.score)]?.c || 'var(--low)', fontWeight: 600 }}>{e.score.toFixed(2)}</span></td>
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
