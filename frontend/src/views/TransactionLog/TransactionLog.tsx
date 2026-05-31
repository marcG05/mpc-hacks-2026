import { useState, useMemo } from 'react';
import { Icon, StatusPill } from '../../components';
import { FRAUD } from '../../data';
import type { Transaction } from '../../types';
import { TransactionDrawer } from './TransactionDrawer';

interface TransactionLogProps {
  txns: Transaction[];
  onSelect: (tx: Transaction) => void;
  onAction?: (action: string, tx: Transaction) => void;
  currentUser?: { username: string } | null;
}

type SortCol = 'score' | 'amount' | 'id' | 'merchant' | 'status';

export function TransactionLog({ txns, onSelect, onAction, currentUser }: TransactionLogProps) {
  // Drawer state
  const [drawerTx, setDrawerTx] = useState<Transaction | null>(null);

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
    <div className="content fade-in" style={{ height: '100vh', display: 'grid', gridTemplateRows: 'auto 1fr', paddingBottom: 0 }}>
      {/* Page Header */}
      <div className="page-head flex between" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
        <div>
          <h1 className="page-title">Transaction Log</h1>
          <div className="page-sub">{txns.length} total records · Click any row to inspect</div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={exportCSV}
          disabled={rows.length === 0}
        >
          <Icon name="upload" size={13} style={{ transform: 'rotate(180deg)' }} /> Export CSV
        </button>
      </div>

      {/* Main split log panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 268px', gap: 14, overflow: 'hidden' }}>

        {/* Left main table wrapper */}
        <div className="card table-wrap" style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden', padding: 0 }}>
          {/* Top filter bar */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              alignItems: 'center',
              background: 'var(--surface-2)',
            }}
          >
            <div className="search" style={{ flex: '1 1 180px', maxWidth: 280, padding: '5px 10px' }}>
              <Icon name="search" size={13} />
              <input
                placeholder="Search ID, merchant, customer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => {
                  const scoreColor = t.score >= 0.90
                    ? '#B91C1C' // Dark red
                    : t.score >= 0.50
                      ? '#D97706' // Warning yellow/amber
                      : 'var(--low)'; // Green
                  
                  const riskLabel = t.score >= 0.98
                    ? 'Critical'
                    : t.score >= 0.90
                      ? 'High'
                      : t.score >= 0.50
                        ? 'Warning'
                        : 'Low';

                  const renderMerchantSubtext = (tx: Transaction) => {
                    const mLower = tx.merchant.toLowerCase();
                    if (mLower.includes('best buy') || mLower.includes('amazon')) {
                      return 'known_merchant';
                    } else if (mLower.includes('steam')) {
                      return 'high_velocity';
                    } else if (mLower.includes('apple')) {
                      return 'unknown';
                    }
                    return tx.customer || 'unknown';
                  };

                  return (
                    <tr 
                      key={t.id} 
                      onClick={() => setDrawerTx(t)} 
                      style={{ cursor: 'pointer', background: drawerTx?.id === t.id ? 'var(--accent-soft)' : undefined }}
                    >
                      <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span className="mono" style={{ fontSize: '15px', fontWeight: 800, color: scoreColor, letterSpacing: '-0.02em' }}>
                              {t.score.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>
                              {riskLabel}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'var(--surface-3)', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                              width: `${t.score * 100}%`,
                              height: '100%',
                              background: scoreColor,
                              borderRadius: 2
                            }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                        <div className="mono" style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text)', marginBottom: 2 }}>
                          {t.id}
                        </div>
                        <div className="mono" style={{ color: "var(--text-3)", fontSize: '11px' }}>
                          {t.card}
                        </div>
                      </td>
                      <td className="mono" style={{ verticalAlign: 'middle', padding: '12px 14px', fontWeight: 800, fontSize: '14.5px', color: 'var(--text)' }}>
                        {FRAUD.money(t.amount)}
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>{t.merchant}</div>
                        <div style={{ color: "var(--text-3)", fontSize: '11.5px', fontStyle: 'italic', marginTop: 2 }}>
                          {renderMerchantSubtext(t)}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          background: 'var(--surface-3)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: 'var(--text-3)',
                          letterSpacing: '0.04em',
                          fontFamily: 'var(--mono)',
                          textTransform: 'uppercase'
                        }}>
                          {t.category}
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                        <StatusPill status={t.status} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()} style={{ verticalAlign: 'middle', padding: '12px 14px' }}>
                        <div className="flex" style={{ gap: 8, justifyContent: 'flex-end' }}>
                          {/* Open side drawer */}
                          <button 
                            className="btn btn-ghost" 
                            title="Inspect in side panel" 
                            onClick={() => setDrawerTx(t)}
                            style={{
                              width: 32,
                              height: 32,
                              padding: 0,
                              display: 'grid',
                              placeItems: 'center',
                              borderRadius: 6,
                              background: 'var(--surface-3)',
                              border: '1px solid var(--border)',
                              color: 'var(--text-2)',
                              cursor: 'pointer'
                            }}
                          >
                            <Icon name="openExternal" size={13} style={{ color: 'var(--text-2)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Filter summary card */}
          <div className="card" style={{ padding: 16 }}>
            <div className="sec-label" style={{ marginBottom: 12 }}>
              <Icon name="grid" size={12} /> Filter Summary
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Showing', value: stats.total, color: 'var(--text)' },
                { label: 'Total Value', value: FRAUD.money(stats.totalValue).replace('.00', ''), color: 'var(--text)' },
                { label: 'Flagged', value: stats.flagged, color: stats.flagged > 0 ? 'var(--critical)' : 'var(--text-3)' },
                { label: 'In Review', value: stats.review, color: stats.review > 0 ? 'var(--medium)' : 'var(--text-3)' },
                { label: 'Decided', value: stats.blocked + stats.cleared, color: 'var(--low)' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex between"
                  style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>{label}</span>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 12.5, color }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick inspect hint */}
          <div
            className="card"
            style={{
              padding: 18,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--primary-soft) 0%, transparent 100%)',
              border: '1px solid var(--primary-line)',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius)',
                background: 'var(--primary-soft)',
                border: '1px solid var(--primary-line)',
                display: 'grid',
                placeItems: 'center',
                marginBottom: 12,
              }}
            >
              <Icon name="sparkle" size={18} style={{ color: 'var(--primary)' }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, letterSpacing: '-0.01em' }}>Quick Inspect</div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>
              Click any row to open signals, geolocation, card history, and AI Gemini without leaving this view.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction side-panel drawer */}
      <TransactionDrawer
        tx={drawerTx}
        onClose={() => setDrawerTx(null)}
        onAction={(action, tx) => {
          onAction?.(action, tx);
          // Keep drawer open so user can see status change
        }}
        currentUser={currentUser}
      />
    </div>
  );
}
