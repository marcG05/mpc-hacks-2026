import { Icon } from '../../../components';
import type { Transaction } from '../../../types';
import type { EscalatedReport } from '../types';

function getMockupTags(t: Transaction): string[] {
  const m = t.merchant.toLowerCase();
  if (m.includes('quickpay')) {
    return t.amount > 500 ? ['STANDARD AUTH', 'CLOUD MERCHANT'] : ['RECURRING'];
  }
  if (m.includes('atm')) {
    return ['PHYSICAL TERMINAL'];
  }
  if (m.includes('schwartz')) {
    return ['LOCAL VENDOR'];
  }
  if (t.channel === 'online') {
    return ['STANDARD AUTH', 'CLOUD MERCHANT'];
  }
  return ['LOCAL VENDOR'];
}

function renderCategoryAvatar(category: string, merchant: string) {
  const m = merchant.toLowerCase();
  if (m.includes('atm')) {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 6, background: '#FFEAB6', color: '#B27B00',
        display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 800, fontFamily: 'var(--mono)',
        flexShrink: 0
      }}>
        ATM
      </div>
    );
  }
  if (m.includes('schwartz') || category === 'dining' || category === 'food') {
    return (
      <div style={{
        width: 32, height: 32, borderRadius: 6, background: '#E2E3E5', color: '#383d41',
        display: 'grid', placeItems: 'center', flexShrink: 0
      }}>
        {/* Fork & Spoon SVG icon */}
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7 3 9 3 9h6s3-2 3-9" />
          <line x1={9} x2={9} y1={17} y2={22} />
          <line x1={15} x2={15} y1={17} y2={22} />
        </svg>
      </div>
    );
  }
  // Default: shopping / retail pink bag
  return (
    <div style={{
      width: 32, height: 32, borderRadius: 6, background: '#FFD1E1', color: '#D63384',
      display: 'grid', placeItems: 'center', flexShrink: 0
    }}>
      {/* Shopping bag SVG */}
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1={3} x2={21} y1={6} y2={6} />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    </div>
  );
}

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
    <div
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr',
        height: '100%',
        overflow: 'hidden',
        borderRight: '1px solid var(--border)',
        paddingRight: 10,
      }}
    >
      {/* ── Tab switcher — pill segment ─────────────────── */}
      <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)', marginBottom: 10 }}>
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: 3,
            gap: 3,
          }}
        >
          {(['queue', 'escalated'] as const).map((tab) => {
            const isActive = sidebarTab === tab;
            const count = tab === 'queue' ? triageQueue.length : escalatedReports.length;
            return (
              <button
                key={tab}
                onClick={() => setSidebarTab(tab)}
                style={{
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  padding: '5px 8px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  fontFamily: 'var(--sans)',
                  transition: 'all .13s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  background: isActive ? 'var(--surface)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-3)',
                  boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                }}
              >
                <Icon name={tab === 'queue' ? 'layers' : 'escalate'} size={11} />
                {tab === 'queue' ? 'Queue' : 'Escalated'}
                <span
                  style={{
                    minWidth: 16,
                    height: 16,
                    borderRadius: 99,
                    fontSize: 9.5,
                    fontFamily: 'var(--mono)',
                    display: 'grid',
                    placeItems: 'center',
                    padding: '0 4px',
                    background: isActive
                      ? tab === 'queue'
                        ? count > 0 ? 'var(--critical)' : 'var(--surface-hi)'
                        : count > 0 ? 'rgba(217,119,6,0.18)' : 'var(--surface-hi)'
                      : 'var(--surface-hi)',
                    color: isActive
                      ? tab === 'queue'
                        ? count > 0 ? '#fff' : 'var(--text-4)'
                        : count > 0 ? 'var(--medium)' : 'var(--text-4)'
                      : 'var(--text-4)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────── */}
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 2 }}>
        {sidebarTab === 'queue' ? (
          <>
            {triageQueue.map((t) => {
              const isActive = activeTx && t.id === activeTx.id;
              const tags = getMockupTags(t);
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTx(t)}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--surface)',
                    border: isActive ? '1.5px solid var(--chat-user-bg)' : '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                    cursor: 'pointer',
                    transition: 'all .12s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.borderColor = 'var(--border-hi)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Top Row: Avatar + Title block + circular chevron button */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {renderCategoryAvatar(t.category, t.merchant)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
                        {t.id}
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: 'var(--text-1)',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          marginTop: 1,
                        }}
                      >
                        {t.merchant}
                      </div>
                    </div>
                    {/* Circlechevron button */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#FFFFFF', border: '1px solid var(--border)',
                      display: 'grid', placeItems: 'center', flexShrink: 0
                    }}>
                      <Icon name="chevron" size={10} style={{ color: 'var(--text-3)' }} />
                    </div>
                  </div>

                  {/* Middle Row: tag pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: '#F4EFE6',
                          color: '#4B4B4B',
                          padding: '2.5px 8px',
                          borderRadius: 99,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Thin divider line */}
                  <div style={{ height: 1, background: 'var(--border)' }} />

                  {/* Bottom Row: Risk Score + Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Risk Score
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--violet)', marginTop: 2 }}>
                        {(t.score * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Amount
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>
                        ${t.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {triageQueue.length === 0 && (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-4)',
                  fontSize: 12.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="check" size={26} style={{ color: 'var(--low)', opacity: 0.5 }} />
                <div>Queue is clear</div>
              </div>
            )}
          </>
        ) : (
          <>
            {escalatedReports.map((r, idx) => {
              const tags = ['ESCALATED', r.department.split(' ')[0].toUpperCase()];
              return (
                <div
                  key={r.txId + '-' + idx}
                  onClick={() => setViewingReport(r)}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xs)',
                    cursor: 'pointer',
                    transition: 'all .12s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-line)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {/* Top Row: Avatar + Title */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {renderCategoryAvatar('escalated', r.txId)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600 }}>
                        {r.txId}
                      </div>
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: 'var(--text-1)',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          marginTop: 1,
                        }}
                      >
                        {r.assignee}
                      </div>
                    </div>
                    {/* Circlechevron button */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', background: '#FFFFFF', border: '1px solid var(--border)',
                      display: 'grid', placeItems: 'center', flexShrink: 0
                    }}>
                      <Icon name="chevron" size={10} style={{ color: 'var(--text-3)' }} />
                    </div>
                  </div>

                  {/* Middle Row: tag pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          background: '#F4EFE6',
                          color: '#4B4B4B',
                          padding: '2.5px 8px',
                          borderRadius: 99,
                          letterSpacing: '0.02em',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Thin divider line */}
                  <div style={{ height: 1, background: 'var(--border)' }} />

                  {/* Bottom Row: Risk Score + Amount */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Risk Score
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--violet)', marginTop: 2 }}>
                        99%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Amount
                      </div>
                      <div className="mono" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)', marginTop: 2 }}>
                        ${r.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {escalatedReports.length === 0 && (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-4)',
                  fontSize: 12.5,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon name="info" size={24} style={{ opacity: 0.4 }} />
                <div>No escalated cases</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
