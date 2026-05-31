import { Icon, SevTag } from '../../../components';
import { FRAUD } from '../../../data';
import type { Transaction } from '../../../types';
import type { TabKey } from '../types';

interface ContextCardProps {
  activeTx: Transaction;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
}

export function ContextCard({ activeTx, activeTab, setActiveTab }: ContextCardProps) {
  return (
    <div className="card" style={{ 
      margin: '5px 0', 
      padding: '14px 16px', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 12,
      background: 'var(--surface)', 
      border: '1px solid var(--border-hi)',
      borderRadius: 'var(--radius)',
    }}>
      {/* Row 1: Amount, ID, Trigger Category and Timestamp */}
      <div className="flex between" style={{ alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              ${activeTx.amount.toFixed(2)}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
                ID: {activeTx.id}
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--accent-line)', width: 'fit-content', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                {FRAUD.FRAUD_TYPES[activeTx.type] || activeTx.type}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)' }}>
              {activeTx.timestamp || activeTx.time}
            </div>
            <span style={{ fontSize: 9.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timestamp</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <SevTag score={activeTx.score} />
          </div>
        </div>
      </div>

      {/* Selection Chips inside the same card */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '6px 8px', 
      }}>
        {[
          { tab: 'amount', label: 'Amount', icon: 'trend', value: `$${activeTx.amount}` },
          { tab: 'location', label: 'Geographic', icon: 'globe', value: `${activeTx.country} -> ${activeTx.merchantCountry}` },
          { tab: 'device', label: 'Device ID', icon: 'device', value: activeTx.device ? activeTx.device.slice(0, 10) : 'None' },
          { tab: 'card', label: 'Payment Card', icon: 'history', value: activeTx.card ? activeTx.card.slice(0, 12) : 'None' },
          { tab: 'signals', label: 'Rule Signals', icon: 'pulse', value: `${activeTx.signals.length} Fired` },
          { tab: 'time', label: 'Timestamp', icon: 'clock', value: activeTx.time }
        ].map((item) => {
          const isActive = activeTab === item.tab;
          return (
            <button 
              key={item.tab}
              onClick={() => setActiveTab(item.tab as TabKey)}
              className="chip"
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '5px 8px', 
                background: isActive ? 'var(--accent-soft)' : 'var(--surface-2)', 
                border: isActive ? '1px solid var(--accent-line)' : '1px solid var(--border)', 
                color: isActive ? 'var(--accent-hi)' : 'var(--text-2)', 
                borderRadius: 'var(--radius-sm)', 
                cursor: 'pointer',
                textAlign: 'left',
                height: 42
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: isActive ? 'var(--accent-hi)' : 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                <Icon name={item.icon} size={9} />
                {item.label}
              </div>
              <div className="mono" style={{ fontSize: 10.5, fontWeight: isActive ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%', marginTop: 2 }}>
                {item.value}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
