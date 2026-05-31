import { useState, useMemo } from 'react';
import { Icon, ScoreBar, StatusPill } from '../../components';
import { FRAUD } from '../../data';
import type { Transaction } from '../../types';

interface TransactionLogProps {
  txns: Transaction[];
  onSelect: (tx: Transaction) => void;
}

type SortCol = 'score' | 'amount' | 'id' | 'merchant' | 'status';

export function TransactionLog({ txns, onSelect }: TransactionLogProps) {
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [query, setQuery] = useState('');

  // Sorting
  const [sortCol, setSortCol] = useState<SortCol>('score');
  const [sortDesc, setSortDesc] = useState(true);

  // Dynamic filter values
  const categories = useMemo(() => {
    const cats = new Set<string>();
    txns.forEach(t => { if (t.category) cats.add(t.category); });
    return Array.from(cats);
  }, [txns]);

  const channels = useMemo(() => {
    const chans = new Set<string>();
    txns.forEach(t => { if (t.channel) chans.add(t.channel); });
    return Array.from(chans);
  }, [txns]);

  // Handle Sort Toggle
  const toggleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(col);
      setSortDesc(true);
    }
  };

  // Filtered and Sorted Rows
  const rows = useMemo(() => {
    let result = txns.filter(t => {
      // 1. Search Query
      if (query) {
        const q = query.toLowerCase();
        const matches = (t.id + t.card + t.merchant + t.customer + t.category).toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'open') {
          if (t.status !== 'flagged' && t.status !== 'review') return false;
        } else if (t.status !== statusFilter) {
          return false;
        }
      }

      // 3. Severity
      if (severityFilter !== 'all') {
        if (FRAUD.sevOf(t.score) !== severityFilter) return false;
      }

      // 4. Category
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // 5. Channel
      if (channelFilter !== 'all' && t.channel !== channelFilter) return false;

      return true;
    });

    // Sort result
    result.sort((a, b) => {
      let valA: any = a[sortCol];
      let valB: any = b[sortCol];

      if (sortCol === 'merchant') {
        valA = a.merchant.toLowerCase();
        valB = b.merchant.toLowerCase();
      }

      if (valA < valB) return sortDesc ? 1 : -1;
      if (valA > valB) return sortDesc ? -1 : 1;
      return 0;
    });

    return result;
  }, [txns, query, statusFilter, severityFilter, categoryFilter, channelFilter, sortCol, sortDesc]);

  // Aggregate Stats for Right Rail
  const stats = useMemo(() => {
    const counts = { total: rows.length, flagged: 0, review: 0, cleared: 0, blocked: 0 };
    let totalValue = 0;
    rows.forEach(t => {
      totalValue += t.amount;
      if (t.status === 'flagged') counts.flagged++;
      else if (t.status === 'review') counts.review++;
      else if (t.status === 'cleared') counts.cleared++;
      else if (t.status === 'blocked' || t.status === 'escalated') counts.blocked++;
    });
    return { ...counts, totalValue };
  }, [rows]);

  // CSV Exporter
  const exportCSV = () => {
    if (rows.length === 0) return;
    const headers = ["ID", "Card", "Amount", "Merchant", "Category", "Customer", "Status", "Score", "Time", "Channel"];
    const rowsCSV = rows.map(t => [
      t.id,
      t.card,
      t.amount,
      t.merchant,
      t.category,
      t.customer,
      t.status,
      t.score.toFixed(3),
      t.time,
      t.channel
    ]);
    
    // Construct CSV String
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rowsCSV.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fraud_hunter_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="content fade-in" style={{ height: 'calc(100vh - 60px)', display: 'grid', gridTemplateRows: 'auto 1fr', paddingBottom: 0 }}>
      {/* Page Header */}
      <div className="page-head flex between" style={{ paddingBottom: 12 }}>
        <div>
          <h1 className="page-title">Transaction Log</h1>
          <div className="page-sub">Comprehensive list of scanned events and history audit log</div>
        </div>
        <button 
          className="btn btn-ghost btn-sm" 
          onClick={exportCSV} 
          disabled={rows.length === 0}
          style={{ gap: 6 }}
        >
          <Icon name="upload" size={14} style={{ transform: 'rotate(180deg)' }} /> Export CSV
        </button>
      </div>

      {/* Main split log panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, overflow: 'hidden' }}>
        
        {/* Left main table wrapper */}
        <div className="card table-wrap" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden', padding: 0 }}>
          {/* Top filter bar */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', background: 'var(--surface)' }}>
            <div className="search" style={{ flex: '1 1 200px', maxWidth: 300, padding: '5px 10px' }}>
              <Icon name="search" size={14} />
              <input 
                placeholder="Search ID, merchant, name..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
              />
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select className="select-btn" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Statuses</option>
                <option value="open">Pending Triage</option>
                <option value="flagged">Flagged</option>
                <option value="review">Review Queue</option>
                <option value="cleared">Cleared</option>
                <option value="blocked">Blocked</option>
                <option value="escalated">Escalated</option>
                <option value="false_positive">False Positive</option>
              </select>

              <select className="select-btn" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select className="select-btn" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select className="select-btn" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
                <option value="all">All Channels</option>
                {channels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ overflowY: 'auto' }}>
            <table className="tbl">
              <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('score')}>
                    Risk {sortCol === 'score' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('id')}>
                    Transaction {sortCol === 'id' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('amount')}>
                    Amount {sortCol === 'amount' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('merchant')}>
                    Merchant {sortCol === 'merchant' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th>Category</th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('status')}>
                    Status {sortCol === 'status' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => onSelect(t)} 
                    style={{ cursor: 'pointer' }}
                  >
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
                    <td style={{ color: "var(--text-2)", fontSize: 12.5 }}>
                      {t.category}
                    </td>
                    <td><StatusPill status={t.status} /></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {/* Hover / inline micro action panel */}
                      <div className="flex" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button 
                          className="icon-btn" 
                          title="View in AI Hub" 
                          onClick={() => onSelect(t)}
                          style={{ width: 28, height: 28, color: 'var(--accent)' }}
                        >
                          <Icon name="sparkle" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-hint" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                        <Icon name="info" size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
                        <div>No transactions match the selected filters</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column aggregated stats rail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="sec-label" style={{ marginBottom: 12 }}><Icon name="grid" size={13} /> Filter Results</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="flex between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Count</span>
                <span className="mono" style={{ fontWeight: 600 }}>{stats.total}</span>
              </div>
              <div className="flex between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Total Value</span>
                <span className="mono" style={{ fontWeight: 600 }}>{FRAUD.money(stats.totalValue).replace('.00', '')}</span>
              </div>
              <div className="flex between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Flagged</span>
                <span className="mono" style={{ color: 'var(--critical)', fontWeight: 600 }}>{stats.flagged}</span>
              </div>
              <div className="flex between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>In Review</span>
                <span className="mono" style={{ color: 'var(--medium)', fontWeight: 600 }}>{stats.review}</span>
              </div>
              <div className="flex between" style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>Decided</span>
                <span className="mono" style={{ color: 'var(--low)', fontWeight: 600 }}>{stats.blocked + stats.cleared}</span>
              </div>
            </div>
          </div>
          
          <div className="card" style={{ padding: 18, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', background: 'linear-gradient(135deg, rgba(77,139,240,0.03) 0%, rgba(77,139,240,0) 100%)' }}>
            <Icon name="shield" size={40} style={{ margin: '0 auto 12px', color: 'var(--accent)', opacity: 0.5 }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 600 }}>Interactive Review</h4>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.5 }}>
              Click on any row in the log to activate the AI Investigation Hub and review risk indicators in detail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
