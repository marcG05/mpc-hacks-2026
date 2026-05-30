import { useState, useEffect } from 'react';
import { FRAUD } from './data';
import { Icon } from './components';
import { Dashboard, ReviewQueue, DecisionLog, Upload } from './views';
import { AIPanel } from './panel';
import type { Transaction, LogEntry } from './types';
import './styles.css';

const NAV = [
  { key: "dashboard", label: "Transactions", icon: "grid" },
  { key: "review",    label: "Review Queue",         icon: "layers" },
  { key: "log",       label: "Decision Log",         icon: "list" },
  { key: "upload",    label: "Import CSV",           icon: "upload" },
];

function nowTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const ACTION_META: Record<string, {label: string, icon: string, c: string}> = {
  block:          { label: "Blocked",        c: "var(--critical)", icon: "block" },
  clear:          { label: "Approved",       c: "var(--low)",      icon: "check" },
  escalate:       { label: "Escalated",      c: "var(--violet)",   icon: "escalate" },
  false_positive: { label: "False positive", c: "var(--text-2)",   icon: "flag" },
};

export default function App() {
  const [route, setRoute] = useState("dashboard");
  const [txns, setTxns] = useState<Transaction[]>(() => FRAUD.TX.map((t) => ({ ...t })));
  const [log, setLog] = useState<LogEntry[]>(() => [...FRAUD.LOG_SEED]);
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState<{msg: string, icon: string, color: string} | null>(null);
  const [updated] = useState(nowTime());
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("fh_collapsed") === "1"; } catch (e) { return false; }
  });

  function toggleCollapsed() {
    setCollapsed((c) => {
      const v = !c;
      try { localStorage.setItem("fh_collapsed", v ? "1" : "0"); } catch (e) {}
      return v;
    });
  }

  const openQueue = txns.filter((t) => t.status === "flagged" || t.status === "review").length;

  function showToast(msg: string, icon: string, color: string) {
    setToast({ msg, icon, color });
    clearTimeout((window as any).__toastT);
    (window as any).__toastT = setTimeout(() => setToast(null), 2600);
  }

  function openPanel(tx: Transaction) {
    setSelected(tx);
    setPanelOpen(true);
  }

  function applyAction(action: string, tx: Transaction) {
    const statusMap: Record<string, any> = { block: "blocked", clear: "cleared", escalate: "escalated", false_positive: "false_positive" };
    const newStatus = statusMap[action];
    setTxns((prev) => prev.map((t) => (t.id === tx.id ? { ...t, status: newStatus } : t)));
    setLog((prev) => [
      { time: nowTime() + ":" + String(new Date().getSeconds()).padStart(2, "0"),
        tx: tx.id, card: tx.card, action, score: tx.score, by: "L. Matkovski" },
      ...prev,
    ]);
    const meta = ACTION_META[action] || ACTION_META.false_positive;
    showToast(`${tx.id} — ${meta.label}`, meta.icon, meta.c);
    if (panelOpen) setPanelOpen(false);
  }

  // Esc closes panel
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && panelOpen) setPanelOpen(false); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  // keep selected tx in sync with latest data
  const selectedLive = selected ? txns.find((t) => t.id === selected.id) || selected : null;

  return (
    <div className={"app" + (collapsed ? " collapsed" : "")}>
      {/* Sidebar */}
      <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
        <div className="brand">
          <div className="brand-mark"><Icon name="shield" size={18} style={{ color: "#fff" }} /></div>
          <div className="brand-text">
            <div className="brand-name">Fraud Hunter</div>
            <div className="brand-sub">Risk Operations</div>
          </div>
        </div>
        <div className="nav-group-label">Monitoring</div>
        {NAV.slice(0, 3).map((n) => (
          <div key={n.key} title={collapsed ? n.label : undefined} className={"nav-item" + (route === n.key ? " active" : "")} onClick={() => setRoute(n.key)}>
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
            {n.key === "dashboard" && <span className="count">{openQueue}</span>}
            {n.key === "review" && <span className="count">{openQueue}</span>}
          </div>
        ))}
        <div className="nav-group-label">Data</div>
        {NAV.slice(3).map((n) => (
          <div key={n.key} title={collapsed ? n.label : undefined} className={"nav-item" + (route === n.key ? " active" : "")} onClick={() => setRoute(n.key)}>
            <Icon name={n.icon} size={17} />
            <span>{n.label}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto" }} className="engine-card">
          <div className="card" style={{ padding: 13 }}>
            <div className="flex" style={{ alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span className="dot" style={{ width: 7, height: 7, borderRadius: 99, background: "var(--low)", boxShadow: "0 0 8px var(--low)" }}></span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Engine online</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
              1,000 txns scanned · F1 <span className="mono" style={{ color: "var(--low)" }}>0.87</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <div className="icon-btn" onClick={toggleCollapsed} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} style={{ flexShrink: 0 }}>
            <Icon name="panelLeft" size={18} />
          </div>
          <div className="search">
            <Icon name="search" size={15} />
            <input placeholder="Search transactions, cards, customers…" />
          </div>
          <div className="topbar-right">
            <div className="updated"><Icon name="refresh" size={13} /> Updated {updated}</div>
            <div className="icon-btn"><Icon name="bell" size={17} /><span className="notif-dot">{openQueue > 9 ? "9+" : openQueue}</span></div>
            <div className="user-chip">
              <span className="user-name">Lucas Matkovski</span>
              <div className="avatar">LM</div>
            </div>
          </div>
        </header>

        {route === "dashboard" && <Dashboard txns={txns} selectedId={panelOpen ? (selectedLive && selectedLive.id) : null} onSelect={openPanel} />}
        {route === "review" && <ReviewQueue txns={txns} onAction={applyAction} onOpenPanel={openPanel} />}
        {route === "log" && <DecisionLog log={log} />}
        {route === "upload" && <Upload onAnalyze={() => setRoute("dashboard")} />}
      </div>

      {/* AI Panel */}
      <AIPanel tx={selectedLive} open={panelOpen} onClose={() => setPanelOpen(false)} onAction={applyAction} />

      {/* Toast */}
      {toast && (
        <div className={"toast show"}>
          <Icon name={toast.icon} size={16} style={{ color: toast.color }} />
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
