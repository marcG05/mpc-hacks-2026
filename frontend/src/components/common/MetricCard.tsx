import { Icon } from './Icon';

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  delta?: string;
  deltaDir?: 'up' | 'down';
  sparkColor?: string;
  sparkPct?: number;
}

export function MetricCard({ label, value, icon, delta, deltaDir, sparkColor, sparkPct }: MetricCardProps) {
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
