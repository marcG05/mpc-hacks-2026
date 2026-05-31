import { useState, useEffect } from 'react';

import { Icon } from './components';
import { 
  WelcomeDashboard, 
  TransactionLog, 
  AIHub, 
  Resources, 
  Settings, 
  Upload 
} from './views';
import type { Transaction, LogEntry, Metrics } from './types';
import { 
  analyzeTransactions, 
  fetchTransactions, 
  fetchDecisions, 
  fetchMetrics, 
  recordDecision, 
  fetchHealth 
} from './services/api';
import './styles.css';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'transactions', label: 'Transaction Log', icon: 'list' },
  { key: 'hub', label: 'Investigation Hub', icon: 'sparkle' },
  { key: 'resources', label: 'Resources Hub', icon: 'globe' },
  { key: 'settings', label: 'Engine Settings', icon: 'bolt' },
];

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

const ACTION_META: Record<string, { label: string; icon: string; c: string }> = {
  block: { label: 'Blocked', c: 'var(--critical)', icon: 'block' },
  clear: { label: 'Approved', c: 'var(--low)', icon: 'check' },
  escalate: { label: 'Escalated', c: 'var(--violet)', icon: 'escalate' },
  false_positive: { label: 'False positive', c: 'var(--text-2)', icon: 'flag' },
};

export default function App() {
  const [route, setRoute] = useState('dashboard');
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  // Selected transaction to pass context to the AI Hub
  const [selectedTxContext, setSelectedTxContext] = useState<Transaction | null>(null);
  
  // Import dataset modal overlay state
  const [importOpen, setImportOpen] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; icon: string; color: string } | null>(null);
  const [updated] = useState(nowTime());
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fh_collapsed') === '1';
    } catch (e) {
      return false;
    }
  });
  const [engineStatus, setEngineStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  // Monitor engine microservice health
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetchHealth();
        setEngineStatus(res.engine === 'online' ? 'online' : 'offline');
      } catch (e) {
        setEngineStatus('offline');
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial transactional & decision data
  useEffect(() => {
    async function loadData() {
      try {
        const [transactions, , metricsPayload] = await Promise.all([
          fetchTransactions(),
          fetchDecisions(),
          fetchMetrics(),
        ]);
        setTxns(transactions);
        setMetrics(metricsPayload);
      } catch (error) {
        console.error('Failed to load backend data:', error);
      }
    }
    loadData();
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const v = !c;
      try {
        localStorage.setItem('fh_collapsed', v ? '1' : '0');
      } catch (e) {
        // ignore
      }
      return v;
    });
  };

  const openQueue = txns.filter((t) => t.status === 'flagged' || t.status === 'review').length;

  const showToast = (msg: string, icon: string, color: string) => {
    setToast({ msg, icon, color });
    clearTimeout((window as any).__toastT);
    (window as any).__toastT = setTimeout(() => setToast(null), 2600);
  };

  const handleNavigate = (targetRoute: string, context?: any) => {
    if (context) {
      setSelectedTxContext(context);
    } else {
      setSelectedTxContext(null);
    }
    setRoute(targetRoute);
  };

  // Process analyst decision actions
  const applyAction = async (action: string, tx: Transaction) => {
    const statusMap: Record<string, any> = {
      block: 'blocked',
      clear: 'cleared',
      escalate: 'escalated',
      false_positive: 'false_positive',
    };
    const newStatus = statusMap[action];
    setTxns((prev) => prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus } : t)));

    const entry: LogEntry = {
      time: nowTime() + ':' + String(new Date().getSeconds()).padStart(2, '0'),
      tx: tx.id,
      card: tx.card,
      action,
      score: tx.score,
      by: 'Lucas Matkovski',
    };

    showToast(`${tx.id} — ${ACTION_META[action]?.label ?? 'Updated'}`, ACTION_META[action]?.icon ?? 'check', ACTION_META[action]?.c ?? 'var(--low)');

    try {
      await recordDecision({ ...entry });
    } catch (error) {
      console.error('Decision recording failed:', error);
    }
  };

  // Process data analysis pipeline imports
  const handleAnalyze = async (file: File) => {
    showToast('Uploading file…', 'pulse', 'var(--accent)');
    try {
      const payload = await analyzeTransactions(file);
      setTxns(payload.transactions);
      const metricsPayload = await fetchMetrics();
      setMetrics(metricsPayload);
      setImportOpen(false);
      setRoute('dashboard');
      showToast('Analysis complete', 'check', 'var(--low)');
    } catch (error) {
      console.error('Upload failed:', error);
      showToast('Upload failed', 'block', 'var(--critical)');
    }
  };

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="brand" onClick={() => handleNavigate('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="brand-mark"><Icon name="shield" size={18} style={{ color: '#fff' }} /></div>
          <div className="brand-text">
            <div className="brand-name" style={{ letterSpacing: '-0.02em' }}>Fraud Hunter</div>
            <div className="brand-sub">Risk Operations</div>
          </div>
        </div>
        
        <div className="nav-group-label">Monitoring</div>
        {NAV.slice(0, 3).map((n) => (
          <div 
            key={n.key} 
            title={collapsed ? n.label : undefined} 
            className={'nav-item' + (route === n.key ? ' active' : '')} 
            onClick={() => handleNavigate(n.key)}
          >
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
            {n.key === 'hub' && openQueue > 0 && <span className="count">{openQueue}</span>}
          </div>
        ))}
        
        <div className="nav-group-label">System</div>
        {NAV.slice(3).map((n) => (
          <div 
            key={n.key} 
            title={collapsed ? n.label : undefined} 
            className={'nav-item' + (route === n.key ? ' active' : '')} 
            onClick={() => handleNavigate(n.key)}
          >
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
          </div>
        ))}
        
        {/* Engine online healthcard */}
        <div style={{ marginTop: 'auto' }} className="engine-card">
          <div className="card" style={{ padding: 13, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="flex" style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: 99, background: engineStatus === 'online' ? 'var(--low)' : engineStatus === 'checking' ? 'var(--accent)' : 'var(--critical)', boxShadow: `0 0 8px ${engineStatus === 'online' ? 'var(--low)' : engineStatus === 'checking' ? 'var(--accent)' : 'var(--critical)'}` }}></span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{engineStatus === 'online' ? 'Engine online' : engineStatus === 'checking' ? 'Checking engine...' : 'Engine offline'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
              {txns.length} txns scanned
              {metrics?.f1 !== undefined ? (
                <> · F1 <span className="mono" style={{ color: 'var(--low)' }}>{metrics.f1.toFixed(2)}</span></>
              ) : (
                <> · <span className="mono" style={{ color: 'var(--text-4)' }}>No metrics</span></>
              )}
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="icon-btn" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} style={{ flexShrink: 0 }}>
            <Icon name="panelLeft" size={18} />
          </div>
          
          <div className="search">
            <Icon name="search" size={15} />
            <input placeholder="Search transactions, cards, device IPs..." />
          </div>

          <div className="topbar-right">
            <div className="updated"><Icon name="refresh" size={13} /> Updated {updated}</div>
            <div className="icon-btn" onClick={() => handleNavigate('hub')} style={{ cursor: 'pointer' }}>
              <Icon name="bell" size={17} />
              {openQueue > 0 && <span className="notif-dot">{openQueue > 9 ? '9+' : openQueue}</span>}
            </div>
            <div className="user-chip" onClick={() => handleNavigate('settings')} style={{ cursor: 'pointer' }}>
              <span className="user-name">Lucas Matkovski</span>
              <div className="avatar">LM</div>
            </div>
          </div>
        </header>

        {/* View routing */}
        {route === 'dashboard' && (
          <WelcomeDashboard 
            txns={txns} 
            metrics={metrics} 
            onNavigate={handleNavigate} 
            onImportClick={() => setImportOpen(true)} 
          />
        )}
        {route === 'transactions' && (
          <TransactionLog 
            txns={txns} 
            onSelect={(tx) => handleNavigate('hub', tx)} 
          />
        )}
        {route === 'hub' && (
          <AIHub 
            txns={txns} 
            initialSelectedTx={selectedTxContext} 
            onAction={applyAction} 
          />
        )}
        {route === 'resources' && (
          <Resources />
        )}
        {route === 'settings' && (
          <Settings />
        )}
      </div>

      {/* Floating CSV Upload Dialog Modal */}
      <div className={'modal-overlay' + (importOpen ? ' show' : '')} onClick={() => setImportOpen(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title">Import Transaction Dataset</h3>
            <div className="icon-btn" onClick={() => setImportOpen(false)} style={{ width: 28, height: 28 }}>
              <Icon name="close" size={18} />
            </div>
          </div>
          <div className="modal-body">
            <Upload onAnalyze={handleAnalyze} />
          </div>
        </div>
      </div>

      {toast && (
        <div className={'toast show'}>
          <Icon name={toast.icon} size={16} style={{ color: toast.color }} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
