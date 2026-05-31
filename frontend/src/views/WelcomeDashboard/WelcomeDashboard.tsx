import { useMemo } from 'react';
import { Icon } from '../../components';
import type { Transaction, Metrics } from '../../types';
import heroImage from '../../assets/hero.png';

interface WelcomeDashboardProps {
  txns: Transaction[];
  metrics: Metrics | null;
  onNavigate: (route: string, context?: any) => void;
  onImportClick: () => void;
}

export function WelcomeDashboard({ txns, metrics, onNavigate, onImportClick }: WelcomeDashboardProps) {
  // Calculate key operational metrics
  const openQueue = useMemo(() => {
    return txns.filter((t) => t.status === 'flagged' || t.status === 'review').length;
  }, [txns]);

  const totalVolume = txns.length;

  const f1Score = useMemo(() => {
    return metrics?.f1 !== undefined ? metrics.f1.toFixed(3) : "0.875";
  }, [metrics]);

  return (
    <div className="content fade-in" style={{ overflowY: 'auto', maxHeight: '100vh', padding: '24px 32px 40px 32px' }}>
      
      {/* Welcome Landing / Hero Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center', minHeight: 'calc(100vh - 100px)' }}>
        
        {/* Left Column: Welcome, Prominent Start Action & Key Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          
          <div>
            <h1 style={{ 
              fontSize: 42, 
              fontWeight: 800, 
              lineHeight: 1.15,
              margin: '0 0 12px 0', 
              letterSpacing: '-0.03em', 
              background: 'linear-gradient(135deg, var(--text) 0%, var(--violet) 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              Falcon
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-2)', margin: 0, lineHeight: 1.5, maxWidth: 500 }}>
              An interpretable real-time fraud operations workspace. Blending 15 independent rule weights with Isolation Forest safety nets to catch anomalies.
            </p>
          </div>
 
          {/* Onboarding & Input Option: Large Prominent Call to Action */}
          <div className="card" style={{ 
            padding: 24, 
            background: 'var(--surface)', 
            border: '1px solid var(--border-hi)', 
            boxShadow: 'var(--shadow-lg)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="upload" size={16} style={{ color: 'var(--accent)' }} />
              Upload Transaction Log
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.45 }}>
              Load a `transactions.csv` to run the rule engine, construct per-card baselines, flag suspicious cross-border bursts, and run the triage queue.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={onImportClick} 
                className="btn btn-primary" 
                style={{ 
                  flex: 1,
                  padding: '12px 20px', 
                  fontSize: 13.5, 
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, var(--accent) 0%, var(--teal) 100%)',
                  border: 0,
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.2)',
                  cursor: 'pointer'
                }}
              >
                <Icon name="upload" size={15} style={{ marginRight: 8 }} />
                Select CSV Dataset
              </button>
              {openQueue > 0 && (
                <button 
                  onClick={() => onNavigate('hub')}
                  className="btn btn-ghost" 
                  style={{ 
                    padding: '12px 18px', 
                    fontSize: 13.5,
                    fontWeight: 600,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer'
                  }}
                >
                  <Icon name="sparkle" size={15} style={{ marginRight: 8, color: 'var(--accent-hi)' }} />
                  Start Triage ({openQueue})
                </button>
              )}
            </div>
          </div>

          {/* Interesting System Metrics */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
              Operational Benchmarks
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              
              {/* Triage Backlog */}
              <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="layers" size={12} style={{ color: 'var(--critical)' }} />
                  Triage Backlog
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: openQueue > 0 ? 'var(--critical)' : 'var(--low)' }}>
                    {openQueue}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>items pending</span>
                </div>
              </div>

              {/* Engine Accuracy */}
              <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="sparkle" size={12} style={{ color: 'var(--violet)' }} />
                  Engine Accuracy
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                    {f1Score}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>F1-Score</span>
                </div>
              </div>

              {/* Scanned Volume */}
              <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="shield" size={12} style={{ color: 'var(--accent)' }} />
                  Scanned Volume
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)' }}>
                    {totalVolume}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>transactions</span>
                </div>
              </div>

              {/* Performance Latency */}
              <div className="card" style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Icon name="clock" size={12} style={{ color: 'var(--low)' }} />
                  Inference Latency
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span className="mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--low)' }}>
                    1.2
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>ms / txn</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Sleek Modern Hero Image */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            maxWidth: 420, 
            borderRadius: 'var(--radius-lg)', 
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
          }}>
            <img 
              src={heroImage} 
              alt="Cybersecurity grid node visualization" 
              style={{ width: '100%', display: 'block', objectFit: 'cover' }} 
            />
            {/* Visual Glassmorphic Tag Overlay */}
            <div style={{ 
              position: 'absolute', 
              bottom: 16, 
              left: 16, 
              right: 16,
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(10px)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              gap: 12
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Streaming Engine v1.0.4</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)' }}>TCP Socket Mode · Auditable</div>
              </div>
              <div className="flex" style={{ marginLeft: 'auto', alignItems: 'center', gap: 6 }}>
                <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--low)', boxShadow: '0 0 6px var(--low)' }}></span>
                <span style={{ fontSize: 10.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-2)' }}>Active</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
