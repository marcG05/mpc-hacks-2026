import { useMemo } from 'react';
import { Icon, MetricCard, Donut } from '../../components';
import { FRAUD } from '../../data';
import type { Transaction, Metrics } from '../../types';

interface WelcomeDashboardProps {
  txns: Transaction[];
  metrics: Metrics | null;
  onNavigate: (route: string, context?: any) => void;
  onImportClick: () => void;
}

export function WelcomeDashboard({ txns, metrics, onNavigate, onImportClick }: WelcomeDashboardProps) {
  // 1. Calculate stats
  const openQueue = useMemo(() => {
    return txns.filter((t) => t.status === 'flagged' || t.status === 'review').length;
  }, [txns]);

  const atRisk = useMemo(() => {
    return txns.filter((t) => t.status === "flagged" || t.status === "review")
      .reduce((s, t) => s + t.amount, 0);
  }, [txns]);

  // 2. High risk transactions
  const highRiskTxns = useMemo(() => {
    return [...txns]
      .filter((t) => t.status === 'flagged' || t.status === 'review')
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [txns]);

  // 3. Donut chart data
  const fraudByType = useMemo(() => {
    if (txns.length === 0) return FRAUD.BY_TYPE;
    
    const groups: Record<string, number> = {};
    txns.forEach(t => {
      if (t.status === 'flagged' || t.status === 'review') {
        const key = t.type !== 'anomaly' ? (FRAUD.FRAUD_TYPES[t.type] || t.type) : (t.signals[0]?.name || 'Anomaly');
        groups[key] = (groups[key] || 0) + 1;
      }
    });
    
    const entries = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length === 0) return FRAUD.BY_TYPE;

    const colors = ["#f0616d", "#e98a45", "#e3bd4e", "#4d8bf0", "#a78bfa"];
    return entries.map(([label, value], i) => ({
      label,
      value,
      color: colors[i % colors.length]
    }));
  }, [txns]);

  // 4. Activity chart over 24 hours
  const hourlyData = useMemo(() => {
    const slots = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, '0')}:00`,
      total: 0,
      flagged: 0
    }));

    if (txns.length === 0) {
      // Mock wave data for a cool first render
      return slots.map((s, i) => {
        const base = 25 + Math.sin(i / 2.5) * 15 + Math.cos(i / 1.2) * 8;
        const total = Math.max(5, Math.round(base));
        const flagged = Math.max(0, Math.round(total * (i >= 8 && i <= 14 ? 0.35 : i % 5 === 0 ? 0.15 : 0.02)));
        return { ...s, total, flagged };
      });
    }

    txns.forEach((t) => {
      let hour = 12;
      const match = t.time.match(/(\d+):/);
      if (match) {
        hour = parseInt(match[1], 10);
        if (t.time.toLowerCase().includes('pm') && hour < 12) hour += 12;
        if (t.time.toLowerCase().includes('am') && hour === 12) hour = 0;
      }
      hour = Math.min(23, Math.max(0, hour));
      slots[hour].total++;
      if (t.status === 'flagged' || t.status === 'review') {
        slots[hour].flagged++;
      }
    });

    return slots;
  }, [txns]);

  const svgData = useMemo(() => {
    const maxVal = Math.max(...hourlyData.map(d => d.total), 10);
    const width = 500;
    const height = 140;
    const paddingX = 15;
    const paddingY = 15;
    
    const points = hourlyData.map((d, i) => {
      const x = paddingX + (i / 23) * (width - paddingX * 2);
      const y = height - paddingY - (d.total / maxVal) * (height - paddingY * 2);
      return { x, y };
    });

    const flaggedPoints = hourlyData.map((d, i) => {
      const x = paddingX + (i / 23) * (width - paddingX * 2);
      const y = height - paddingY - (d.flagged / maxVal) * (height - paddingY * 2);
      return { x, y };
    });

    const totalPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const flaggedPath = flaggedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const totalArea = totalPath ? `${totalPath} L ${points[points.length-1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z` : '';
    const flaggedArea = flaggedPath ? `${flaggedPath} L ${flaggedPoints[flaggedPoints.length-1].x} ${height - paddingY} L ${flaggedPoints[0].x} ${height - paddingY} Z` : '';

    return { totalPath, flaggedPath, totalArea, flaggedArea, points, flaggedPoints, maxVal };
  }, [hourlyData]);

  return (
    <div className="content fade-in" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 60px)', paddingBottom: 40 }}>
      {/* Welcome Header */}
      <div className="page-head flex between" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Welcome back, Lucas
          </h1>
          <div className="page-sub" style={{ fontSize: 13.5, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span className="dot" style={{ width: 6, height: 6, borderRadius: '99px', background: 'var(--low)' }}></span>
            Fraud Hunter scanning active · Last activity processed: just now
          </div>
        </div>
        <div className="toolbar" style={{ gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onImportClick}>
            <Icon name="upload" size={14} /> Import Dataset
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('hub')} style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #3bb6c4 100%)', border: 0, boxShadow: '0 4px 12px rgba(77,139,240,0.3)' }}>
            <Icon name="sparkle" size={14} /> Start Triage Queue
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard 
          label="Total Scanned" 
          value={txns.length} 
          icon="shield" 
          sparkPct={100}
          sparkColor="var(--accent)"
        />
        <MetricCard 
          label="Flagged Queue" 
          value={openQueue} 
          icon="flag" 
          sparkPct={txns.length > 0 ? (openQueue / txns.length) * 100 : 0}
          sparkColor="var(--critical)"
        />
        <MetricCard 
          label="Engine F1-Score" 
          value={metrics?.f1 !== undefined ? metrics.f1.toFixed(3) : "0.875"} 
          icon="sparkle" 
          sparkPct={metrics?.f1 !== undefined ? metrics.f1 * 100 : 87.5}
          sparkColor="var(--violet)"
        />
        <MetricCard 
          label="Amount At Risk" 
          value={FRAUD.money(atRisk).replace(".00", "")} 
          icon="trend" 
          sparkPct={70}
          sparkColor="var(--high)"
        />
      </div>

      {/* Main Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 18, alignItems: "start" }}>
        
        {/* Left Column: Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Chart 1: Temporal Activity Timeline */}
          <div className="card" style={{ padding: 20 }}>
            <div className="flex between" style={{ marginBottom: 16 }}>
              <div className="sec-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="pulse" size={14} /> Scanning Activity Timeline (24h)
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-3)' }}>
                <span className="flex" style={{ alignItems: 'center', gap: 4 }}>
                  <i style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }}></i> All Volume
                </span>
                <span className="flex" style={{ alignItems: 'center', gap: 4 }}>
                  <i style={{ width: 8, height: 8, background: 'var(--critical)', borderRadius: 2 }}></i> Flagged
                </span>
              </div>
            </div>
            
            <div style={{ position: 'relative', width: '100%', height: 140, marginBottom: 12 }}>
              <svg width="100%" height="100%" viewBox="0 0 500 140" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--critical)" stopOpacity="0.30" />
                    <stop offset="100%" stopColor="var(--critical)" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* Y-axis gridlines */}
                <line x1="15" y1="15" x2="485" y2="15" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="15" y1="70" x2="485" y2="70" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3,3" />
                <line x1="15" y1="125" x2="485" y2="125" stroke="var(--border)" strokeWidth="0.5" />

                {/* Main Volume area and stroke */}
                <path d={svgData.totalArea} fill="url(#totalGrad)" />
                <path d={svgData.totalPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />

                {/* Flagged Volume area and stroke */}
                {svgData.flaggedArea && <path d={svgData.flaggedArea} fill="url(#flaggedGrad)" />}
                {svgData.flaggedPath && <path d={svgData.flaggedPath} fill="none" stroke="var(--critical)" strokeWidth="1.8" />}

                {/* Bullet highlights for active/high spikes */}
                {svgData.flaggedPoints.map((p, i) => {
                  const hourData = hourlyData[i];
                  if (hourData.flagged > 0 && i % 3 === 0) {
                    return (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r="5" fill="var(--critical)" opacity="0.4" />
                        <circle cx={p.x} cy={p.y} r="2.5" fill="#fff" />
                      </g>
                    );
                  }
                  return null;
                })}
              </svg>
            </div>
            
            {/* Timeline X axis labels */}
            <div className="flex between" style={{ padding: '0 10px', fontSize: 10.5, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>

          {/* Chart 2: Fraud Distribution and Metrics breakdown */}
          <div className="card" style={{ padding: 20 }}>
            <div className="sec-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="layers" size={14} /> Risk Distribution by Fraud Type
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 24, alignItems: 'center' }}>
              <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
                <Donut data={fraudByType} size={132} thickness={15} />
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)' }}>{openQueue}</div>
                    <div style={{ fontSize: 9, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>Triage items</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fraudByType.map((d, i) => (
                  <div className="legend-row flex between" key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                    <span className="flex" style={{ alignItems: 'center', gap: 8 }}>
                      <span className="legend-dot" style={{ background: d.color, width: 8, height: 8, borderRadius: '50%' }}></span>
                      <span style={{ color: "var(--text-2)", fontSize: 12.5 }} title={d.label}>{d.label}</span>
                    </span>
                    <span className="legend-val mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High Risk Alerts & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Quick Actions Panel */}
          <div className="card" style={{ padding: 20, background: 'linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)', border: '1px solid var(--border-hi)' }}>
            <div className="sec-label" style={{ marginBottom: 14, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="bolt" size={14} style={{ color: 'var(--medium)' }} /> Quick Navigation
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => onNavigate('transactions')} style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.02)' }}>
                <Icon name="list" size={15} style={{ marginRight: 8, color: 'var(--accent)' }} /> Full Transaction Log
              </button>
              
              <button className="btn btn-ghost" onClick={() => onNavigate('settings')} style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.02)' }}>
                <Icon name="bolt" size={15} style={{ marginRight: 8, color: 'var(--medium)' }} /> Engine Weights & Tuner
              </button>

              <button className="btn btn-ghost" onClick={() => onNavigate('resources')} style={{ justifyContent: 'flex-start', padding: '10px 12px', fontSize: 13, background: 'rgba(255,255,255,0.02)' }}>
                <Icon name="globe" size={15} style={{ marginRight: 8, color: 'var(--teal)' }} /> Analyst Resources Hub
              </button>
            </div>
          </div>

          {/* Recent High-Risk Incidents */}
          <div className="card" style={{ padding: 20 }}>
            <div className="sec-label" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="flag" size={14} style={{ color: 'var(--critical)' }} /> Urgent Triage Alerts
            </div>

            {highRiskTxns.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                <Icon name="check" size={32} style={{ color: 'var(--low)', opacity: 0.5, marginBottom: 8 }} />
                <div style={{ fontSize: 12.5 }}>All high-risk incidents resolved</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {highRiskTxns.map((t) => (
                  <div 
                    key={t.id} 
                    className="high-risk-item" 
                    onClick={() => onNavigate('hub', t)} 
                    style={{ 
                      padding: 12, 
                      borderRadius: 'var(--radius-sm)', 
                      background: 'var(--surface-2)', 
                      borderLeft: '3px solid var(--critical)', 
                      cursor: 'pointer',
                      transition: 'transform 0.15s, background-color 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-3)';
                      e.currentTarget.style.transform = 'translateX(2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div className="flex between" style={{ marginBottom: 4 }}>
                      <span className="mono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-1)' }}>{t.id}</span>
                      <span className="mono" style={{ color: 'var(--critical)', fontWeight: 700, fontSize: 11.5 }}>
                        Score {(t.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex between" style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      <span>{t.merchant}</span>
                      <span className="mono" style={{ color: 'var(--text-2)', fontWeight: 500 }}>${t.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
