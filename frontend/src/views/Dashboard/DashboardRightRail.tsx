import { Icon, Donut } from '../../components';
import { FRAUD } from '../../data';

export function DashboardRightRail() {
  return (
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
            <div className="brk-bar"><i style={{ width: pct as number + "%", background: c as string }}></i></div>
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
  );
}
