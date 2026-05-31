import { useMemo } from 'react';
import { Icon, Donut } from '../../components';
import { FRAUD } from '../../data';
import type { Metrics, Transaction } from '../../types';

interface DashboardRightRailProps {
  metrics?: Metrics | null;
  counts?: { open: number };
  txns?: Transaction[];
}

export function DashboardRightRail({ metrics, counts, txns }: DashboardRightRailProps) {
  const fraudByType = useMemo(() => {
    if (!txns || txns.length === 0) return FRAUD.BY_TYPE;
    
    const groups: Record<string, number> = {};
    txns.forEach(t => {
      if (t.status === 'flagged' || t.status === 'review') {
        const key = t.type !== 'anomaly' ? (FRAUD.FRAUD_TYPES[t.type] || t.type) : (t.signals[0]?.name || 'Anomaly');
        groups[key] = (groups[key] || 0) + 1;
      }
    });
    
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (entries.length === 0) return FRAUD.BY_TYPE;

    const colors = ["#f0616d", "#e98a45", "#e3bd4e", "#4d8bf0", "#a78bfa", "#38c08a"];
    return entries.map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length]
    }));
  }, [txns]);

  const topSignals = useMemo(() => {
    const fallback: [string, number, string][] = [
      ["Waiting transactions..", 0, "var(--critical)"],
    ];
    if (!txns || txns.length === 0) return fallback;

    const sigCounts: Record<string, { count: number, color: string }> = {};
    let totalSigs = 0;
    
    txns.forEach(t => {
      if (t.status === 'flagged' || t.status === 'review') {
        t.signals.forEach(s => {
          if (!sigCounts[s.name]) sigCounts[s.name] = { count: 0, color: s.color === 'critical' ? 'var(--critical)' : 'var(--high)' };
          sigCounts[s.name].count++;
          totalSigs++;
        });
      }
    });

    const entries = Object.entries(sigCounts).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
    if (entries.length === 0) return fallback;

    return entries.map(([name, data]) => [name, Math.round((data.count / totalSigs) * 100), data.color] as [string, number, string]);
  }, [txns]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 17 }}>
        <div className="sec-label" style={{ marginBottom: 16 }}><Icon name="layers" size={13} /> Fraud by type</div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ position: "relative" }}>
            <Donut data={fraudByType} size={132} thickness={16} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
              <div>
                <div className="mono" style={{ fontSize: 23, fontWeight: 700 }}>{counts?.open || 0}</div>
                <div style={{ fontSize: 9.5, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em" }}>flagged</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 14px" }}>
          {fraudByType.map((d, i) => (
            <div className="legend-row" key={i}>
              <span className="legend-dot" style={{ background: d.color }}></span>
              <span style={{ color: "var(--text-2)", fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={d.label}>{d.label}</span>
              <span className="legend-val" style={{ fontSize: 11.5 }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 17 }}>
        <div className="sec-label" style={{ marginBottom: 13 }}><Icon name="pulse" size={13} /> Top signals (24h)</div>
        {topSignals.map(([name, pct, c], i) => (
          <div className="brk-row" key={i} style={{ marginBottom: 11 }}>
            <div className="brk-name" style={{ width: 130 }} title={name as string}>{name}</div>
            <div className="brk-bar"><i style={{ width: pct as number + "%", background: c as string }}></i></div>
            <div className="brk-val">{pct}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 17 }}>
        <div className="sec-label" style={{ marginBottom: 12 }}><Icon name="info" size={13} /> Model</div>
        <div className="flex between" style={{ marginBottom: 9 }}>
          <span style={{ color: "var(--text-2)", fontSize: 12.5 }}>F1 score</span>
          <span className="mono" style={{ fontWeight: metrics?.f1 !== undefined ? 700 : 400, color: metrics?.f1 !== undefined ? "var(--low)" : "var(--text-4)" }}>{metrics?.f1 !== undefined ? metrics.f1.toFixed(3) : "—"}</span>
        </div>
        <div className="flex between" style={{ marginBottom: 9 }}>
          <span style={{ color: "var(--text-2)", fontSize: 12.5 }}>Precision</span>
          <span className="mono" style={{ fontWeight: metrics?.precision !== undefined ? 600 : 400, color: metrics?.precision !== undefined ? "var(--text-1)" : "var(--text-4)" }}>{metrics?.precision !== undefined ? metrics.precision.toFixed(3) : "—"}</span>
        </div>
        <div className="flex between">
          <span style={{ color: "var(--text-2)", fontSize: 12.5 }}>Recall</span>
          <span className="mono" style={{ fontWeight: metrics?.recall !== undefined ? 600 : 400, color: metrics?.recall !== undefined ? "var(--text-1)" : "var(--text-4)" }}>{metrics?.recall !== undefined ? metrics.recall.toFixed(3) : "—"}</span>
        </div>
      </div>
    </div>
  );
}
