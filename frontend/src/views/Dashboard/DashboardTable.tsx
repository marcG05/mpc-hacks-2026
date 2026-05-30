import { Icon, ScoreBar, StatusPill } from '../../components';
import { FRAUD } from '../../data';
import type { Transaction } from '../../types';

interface DashboardTableProps {
  filter: string;
  setFilter: (f: string) => void;
  query: string;
  setQuery: (q: string) => void;
  counts: Record<string, number>;
  rows: Transaction[];
  selectedId: string | null;
  onSelect: (tx: Transaction) => void;
}

export function DashboardTable({ filter, setFilter, query, setQuery, counts, rows, selectedId, onSelect }: DashboardTableProps) {
  return (
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
            <tr><td colSpan={7}><div className="empty-hint">No transactions match this filter.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
