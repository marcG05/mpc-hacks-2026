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
  let dotColor = '#12B76A'; // Soft emerald green
  let borderColor = '#D1FADF';
  let bg = '#ECFDF3';
  let fgColor = '#027A48';

  if (score >= 0.8) {
    label = 'Critical';
    dotColor = '#D92D20'; // Soft crimson red
    borderColor = '#FEE4E2';
    bg = '#FEF3F2';
    fgColor = '#B42318';
  } else if (score >= 0.6) {
    label = 'High';
    dotColor = '#EF6820'; // Soft warm orange
    borderColor = '#FFEAD5';
    bg = '#FEF6EE';
    fgColor = '#B93815';
  } else if (score >= 0.45) {
    label = 'Medium';
    dotColor = '#F79009'; // Soft amber yellow
    borderColor = '#FEF0C7';
    bg = '#FFFAEB';
    fgColor = '#B54708';
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
      fontWeight: 600,
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
        margin: '0 0 16px 0',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        background: '#FFFFFF',
        border: '1px solid #E4E7EC',
        borderRadius: '16px',
        boxShadow: '0px 4px 18px rgba(16, 24, 40, 0.03), 0px 1px 3px rgba(16, 24, 40, 0.02)',
        fontFamily: 'var(--sans)',
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
            style={{
              fontSize: 34,
              fontWeight: 700,
              color: '#101828',
              letterSpacing: '-0.03em',
              fontFamily: 'var(--sans)',
            }}
          >
            ${activeTx.amount.toFixed(2)}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#344054',
                background: '#F2F4F7',
                padding: '3.5px 8px',
                borderRadius: 6,
                border: '1px solid #E4E7EC',
                fontFamily: 'var(--sans)',
              }}
            >
              {activeTx.id}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#5925DC',
                background: '#F4F3FF',
                padding: '3.5px 8px',
                borderRadius: 6,
                border: '1px solid #D9D6FE',
                textTransform: 'uppercase',
                fontFamily: 'var(--sans)',
              }}
            >
              {FRAUD.FRAUD_TYPES[activeTx.type] || activeTx.type}
            </span>
          </div>
        </div>

        {/* Right: Timestamp label + severity pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: '#344054',
              fontFamily: 'var(--sans)',
            }}>
              {activeTx.timestamp || activeTx.time}
            </div>
            <span
              style={{
                fontSize: 9.5,
                color: '#98A2B3',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                display: 'block',
                marginTop: 2,
                fontFamily: 'var(--sans)',
              }}
            >
              Timestamp
            </span>
          </div>
          {renderSeverityPill(activeTx.score)}
        </div>
      </div>

      {/* Horizontal Divider Separator */}
      <div style={{ height: 1, background: '#F2F4F7', margin: '4px 0' }} />

      {/* ── Row 2: 2x3 Outline Card Grid ──────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
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
                padding: '12px 16px',
                background: isActive ? '#F9F5FF' : '#F9FAFB',
                border: isActive ? '1.5px solid #7F56D9' : '1px solid #E4E7EC',
                color: isActive ? '#4A1FB8' : '#344054',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                minHeight: 58,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                fontFamily: 'var(--sans)',
                boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.04)',
                outline: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 9.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  marginBottom: 6,
                  color: isActive ? '#7F56D9' : '#667085',
                  fontFamily: 'var(--sans)',
                }}
              >
                <Icon name={icon} size={10} />
                {label}
              </div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  color: isActive ? '#53389E' : '#1D2939',
                  fontFamily: 'var(--sans)',
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
