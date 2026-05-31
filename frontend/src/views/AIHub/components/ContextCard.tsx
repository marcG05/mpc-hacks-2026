import { Icon } from '../../../components';
import { FRAUD } from '../../../data';
import type { Transaction } from '../../../types';
import type { TabKey } from '../types';

interface ContextCardProps {
  activeTx: Transaction;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

const TAB_CONFIG = [
  { tab: 'amount'  , label: 'Amount'    , icon: 'trend'   , getValue: (tx: Transaction) => `$${tx.amount.toFixed(2)}` },
  { tab: 'location', label: 'Location'  , icon: 'globe'   , getValue: (tx: Transaction) => `${tx.country} → ${tx.merchantCountry}` },
  { tab: 'device'  , label: 'Device'    , icon: 'device'  , getValue: (tx: Transaction) => tx.device ? tx.device : 'None' },
  { tab: 'card'    , label: 'Card'      , icon: 'history' , getValue: (tx: Transaction) => tx.card ? tx.card : 'None' },
  { tab: 'signals' , label: 'Signals'   , icon: 'pulse'   , getValue: (tx: Transaction) => `${tx.signals.length} Fired` },
  { tab: 'time'    , label: 'Timestamp' , icon: 'clock'   , getValue: (tx: Transaction) => tx.time },
] as const;

function renderSeverityPill(score: number) {
  let label = 'Low';
  let dotColor = 'var(--low)';
  let borderColor = 'rgba(34, 197, 94, 0.25)';
  let bg = 'rgba(34, 197, 94, 0.04)';
  let fgColor = 'var(--low)';

  if (score >= 0.8) {
    label = 'Critical';
    dotColor = 'var(--critical)';
    borderColor = 'rgba(239, 68, 68, 0.25)';
    bg = 'rgba(239, 68, 68, 0.04)';
    fgColor = 'var(--critical)';
  } else if (score >= 0.6) {
    label = 'High';
    dotColor = 'var(--high)';
    borderColor = 'rgba(249, 115, 22, 0.25)';
    bg = 'rgba(249, 115, 22, 0.04)';
    fgColor = 'var(--high)';
  } else if (score >= 0.45) {
    label = 'Medium';
    dotColor = 'var(--medium)';
    borderColor = 'rgba(234, 179, 8, 0.35)';
    bg = '#FFFDF2';
    fgColor = 'var(--medium)';
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '4px 10px',
      borderRadius: 99,
      border: `1px solid ${borderColor}`,
      background: bg,
      color: fgColor,
      fontSize: 11,
      fontWeight: 700,
      fontFamily: 'var(--sans)'
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
      {label}
    </div>
  );
}

export function ContextCard({ activeTx, activeTab, setActiveTab }: ContextCardProps) {
  return (
    <div
      className="card"
      style={{
        margin: '0 0 10px 0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow-xs)'
      }}
    >
      {/* ── Row 1: Giant Amount + meta tags + severity pill ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Giant Amount + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            className="mono"
            style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.035em' }}
          >
            ${activeTx.amount.toFixed(2)}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              className="mono"
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: 'var(--text-2)',
                background: '#F4EFE6',
                padding: '3px 8px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                letterSpacing: '0.01em',
              }}
            >
              {activeTx.id}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: 'var(--violet)',
                background: 'rgba(139, 92, 246, 0.08)',
                padding: '3.5px 8px',
                borderRadius: 4,
                border: '1px solid rgba(139, 92, 246, 0.16)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {FRAUD.FRAUD_TYPES[activeTx.type] || activeTx.type}
            </span>
          </div>
        </div>

        {/* Right: Timestamp label + severity pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
              {activeTx.timestamp || activeTx.time}
            </div>
            <span
              style={{
                fontSize: 9.5,
                color: 'var(--text-4)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 700,
                display: 'block',
                marginTop: 2
              }}
            >
              Timestamp
            </span>
          </div>
          {renderSeverityPill(activeTx.score)}
        </div>
      </div>

      {/* Horizontal Divider Separator */}
      <div style={{ height: 1, background: 'var(--border)', margin: '0' }} />

      {/* ── Row 2: 2x3 Outline Card Grid ──────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
        }}
      >
        {TAB_CONFIG.map(({ tab, label, icon, getValue }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as TabKey)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '12px 14px',
                background: isActive ? 'var(--primary-soft)' : 'var(--surface)',
                border: isActive ? '1.5px solid var(--violet)' : '1px solid var(--border)',
                color: isActive ? 'var(--primary)' : 'var(--text-3)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 56,
                transition: 'all .12s',
                fontFamily: 'var(--sans)',
                boxShadow: 'var(--shadow-xs)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 9.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 700,
                  marginBottom: 6,
                  color: isActive ? 'var(--violet)' : 'var(--text-4)',
                }}
              >
                <Icon name={icon} size={10} />
                {label}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  color: '#1A1A1A',
                }}
              >
                {getValue(activeTx)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
