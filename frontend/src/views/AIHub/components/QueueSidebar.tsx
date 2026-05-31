import { Icon } from '../../../components';
import type { Transaction } from '../../../types';
import type { EscalatedReport } from '../types';

interface QueueSidebarProps {
  triageQueue: Transaction[];
  activeTx: Transaction | null;
  setSelectedTx: (tx: Transaction | null) => void;
  escalatedReports: EscalatedReport[];
  setViewingReport: (r: EscalatedReport | null) => void;
  sidebarTab: 'queue' | 'escalated';
  setSidebarTab: (tab: 'queue' | 'escalated') => void;
}

export function QueueSidebar({
  triageQueue,
  activeTx,
  setSelectedTx,
  escalatedReports,
  setViewingReport,
  sidebarTab,
  setSidebarTab,
}: QueueSidebarProps) {
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%', overflow: 'hidden', borderRight: '1px solid var(--border)', paddingRight: 12 }}>
      <div style={{ padding: '12px 0 8px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
        <button 
          onClick={() => setSidebarTab('queue')}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: sidebarTab === 'queue' ? 'var(--accent)' : 'var(--text-3)',
            fontWeight: sidebarTab === 'queue' ? 700 : 500,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 2px',
            borderBottom: sidebarTab === 'queue' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <Icon name="layers" size={12} /> Queue ({triageQueue.length})
        </button>
        <button 
          onClick={() => setSidebarTab('escalated')}
          style={{
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: sidebarTab === 'escalated' ? 'var(--accent)' : 'var(--text-3)',
            fontWeight: sidebarTab === 'escalated' ? 700 : 500,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 2px',
            borderBottom: sidebarTab === 'escalated' ? '2px solid var(--accent)' : '2px solid transparent'
          }}
        >
          <Icon name="escalate" size={12} /> Escalated ({escalatedReports.length})
        </button>
      </div>
      
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
        {sidebarTab === 'queue' ? (
          <>
            {triageQueue.map(t => {
              const isActive = activeTx && t.id === activeTx.id;
              return (
                <div 
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  style={{
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--surface-3)' : 'var(--surface-2)',
                    border: isActive ? '1px solid var(--accent-line)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s, border-color 0.15s'
                  }}
                >
                  <div className="flex between" style={{ marginBottom: 4 }}>
                    <span className="mono" style={{ fontWeight: 600, fontSize: 11.5, color: isActive ? 'var(--text-1)' : 'var(--text-2)' }}>{t.id}</span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: t.score >= 0.8 ? 'var(--critical)' : 'var(--high)' }}>
                      {(t.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex between" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    <span style={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
                    <span className="mono">${t.amount.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
            {triageQueue.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                <Icon name="check" size={28} style={{ color: 'var(--low)', marginBottom: 8, opacity: 0.5 }} />
                <div>Queue is clean</div>
              </div>
            )}
          </>
        ) : (
          <>
            {escalatedReports.map((r, idx) => (
              <div 
                key={r.txId + '-' + idx}
                onClick={() => setViewingReport(r)}
                style={{
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div className="flex between" style={{ marginBottom: 4 }}>
                  <span className="mono" style={{ fontWeight: 600, fontSize: 11.5, color: 'var(--text-2)' }}>{r.txId}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--critical)' }}>
                    ${r.amount.toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{r.assignee.split(' ')[0]} ({r.department.split(' ')[0]})</span>
                  <span style={{ fontSize: 9, background: 'rgba(233,138,69,0.1)', color: 'var(--medium)', padding: '1px 4px', borderRadius: 2 }}>Escalated</span>
                </div>
              </div>
            ))}
            {escalatedReports.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
                <Icon name="info" size={24} style={{ color: 'var(--text-4)', marginBottom: 8, opacity: 0.5 }} />
                <div>No escalated cases yet</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
