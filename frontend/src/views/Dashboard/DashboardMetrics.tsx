import { MetricCard } from '../../components';
import { FRAUD } from '../../data';
import type { Metrics } from '../../types';

interface DashboardMetricsProps {
  counts: { open: number };
  atRisk: number;
  confirmed: number;
  fpRate: number;
  metrics?: Metrics | null;
}

export function DashboardMetrics({ counts, atRisk, metrics }: DashboardMetricsProps) {
  return (
    <div className="metrics">
      <MetricCard label="Flagged today" value={counts.open} icon="flag" />
      <MetricCard label="Amount at risk" value={FRAUD.money(atRisk).replace(".00", "")} icon="trend" />
      <MetricCard label="Engine F1 Score" value={metrics?.f1 !== undefined ? metrics.f1.toFixed(3) : "—"} icon="sparkle" />
      <MetricCard label="Engine Precision" value={metrics?.precision !== undefined ? metrics.precision.toFixed(3) : "—"} icon="check" />
    </div>
  );
}
