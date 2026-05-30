import { MetricCard } from '../../components';
import { FRAUD } from '../../data';

interface DashboardMetricsProps {
  counts: { open: number };
  atRisk: number;
  confirmed: number;
  fpRate: number;
}

export function DashboardMetrics({ counts, atRisk, confirmed, fpRate }: DashboardMetricsProps) {
  return (
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
  );
}
