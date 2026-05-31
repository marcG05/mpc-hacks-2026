import { useState, useEffect } from 'react';

import { Icon } from './components';
import { 
  WelcomeDashboard, 
  TransactionLog, 
  AIHub, 
  Upload,
  LoginView
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
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(() => {
    try {
      const saved = sessionStorage.getItem('fh_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [route, setRoute] = useState('dashboard');
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  
  // Selected transaction to pass context to the AI Hub
  const [selectedTxContext, setSelectedTxContext] = useState<Transaction | null>(null);
  
  // Import dataset modal overlay state
  const [importOpen, setImportOpen] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; icon: string; color: string } | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('fh_collapsed') === '1';
    } catch (e) {
      return false;
    }
  });
  const [engineStatus, setEngineStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const handleLogout = () => {
    localStorage.removeItem('fh_current_user');
    setCurrentUser(null);
    showToast('Logged out successfully', 'check', 'var(--low)');
  };

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
      by: currentUser?.username || 'Admin',
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

  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={(u) => {
          setCurrentUser(u);
          sessionStorage.setItem('fh_current_user', JSON.stringify(u));
          showToast('Welcome back, ' + u.username, 'check', 'var(--low)');
        }} />
        {toast && (
          <div className={'toast show'} style={{ zIndex: 100000 }}>
            <Icon name={toast.icon} size={16} style={{ color: toast.color }} />
            <span>{toast.msg}</span>
          </div>
        )}
      </>
    );
  }

  return (
    <div className={'app' + (collapsed ? ' collapsed' : '')}>
      <aside className={'sidebar' + (collapsed ? ' collapsed' : '')}>
        <div className="brand" onClick={toggleCollapsed} style={{ cursor: 'pointer' }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <div className="brand-mark"><Icon name="shield" size={18} style={{ color: '#fff' }} /></div>
          <div className="brand-text">
            <div className="brand-name" style={{ letterSpacing: '-0.02em' }}>Falcon</div>
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
        
        {/* Logout action */}
        <div 
          className="nav-item" 
          onClick={handleLogout}
          style={{ marginTop: 'auto', color: 'var(--critical)', cursor: 'pointer' }}
          title={collapsed ? "Logout" : undefined}
        >
          <Icon name="block" size={17} style={{ color: 'var(--critical)' }} />
          <span>Logout</span>
        </div>

        {/* Notifications */}
        <div 
          className="nav-item" 
          onClick={() => handleNavigate('hub')}
          style={{ cursor: 'pointer' }}
          title={collapsed ? `Notifications (${openQueue})` : undefined}
        >
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Icon name="bell" size={17} />
            {openQueue > 0 && <span className="notif-dot" style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, fontSize: 8, border: '1px solid var(--surface-2)' }}>{openQueue}</span>}
          </div>
          <span>Notifications</span>
          {openQueue > 0 && !collapsed && <span className="count">{openQueue}</span>}
        </div>

        {/* User profile details */}
        <div 
          className="nav-item" 
          style={{ cursor: 'pointer' }} 
          title={collapsed ? currentUser.username : undefined}
        >
          <div className="avatar" style={{ width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(150deg, #5b8def, #8a6cf0)', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700, color: '#fff', marginRight: 0 }}>
            {currentUser.username.substring(0, 2).toUpperCase()}
          </div>
          <span>Profile ({currentUser.username})</span>
        </div>

        {/* Engine online healthcard */}
        <div className="engine-card" style={{ marginTop: 8 }}>
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
            onAction={applyAction}
            currentUser={currentUser}
          />
        )}
        {route === 'hub' && (
          <AIHub 
            txns={txns} 
            initialSelectedTx={selectedTxContext} 
            onAction={applyAction} 
            currentUser={currentUser}
          />
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
