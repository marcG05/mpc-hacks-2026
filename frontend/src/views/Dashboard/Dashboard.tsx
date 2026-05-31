import { useState, useMemo } from 'react';
import { FRAUD } from '../../data';
import { Icon } from '../../components';
import type { Transaction } from '../../types';
import { DashboardMetrics } from './DashboardMetrics';
import { DashboardTable } from './DashboardTable';
import { DashboardRightRail } from './DashboardRightRail';

interface DashboardProps {
  txns: Transaction[];
  metrics?: any;
  selectedId: string | null;
  onSelect: (tx: Transaction) => void;
}

export function Dashboard({ txns, metrics, selectedId, onSelect }: DashboardProps) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
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

  const rows = useMemo(() => {
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
  const fpRate = Math.round(txns.filter((t) => t.status === "false_positive").length / Math.max(1, txns.length) * 100);

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

      <DashboardMetrics counts={counts} atRisk={atRisk} confirmed={confirmed} fpRate={fpRate} metrics={metrics} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 296px", gap: 16, alignItems: "start" }}>
        <DashboardTable 
          filter={filter} setFilter={setFilter} 
          query={query} setQuery={setQuery} 
          counts={counts as any} rows={rows} 
          selectedId={selectedId} onSelect={onSelect} 
        />
        <DashboardRightRail metrics={metrics} counts={counts as any} txns={txns} />
      </div>
    </div>
  );
}
