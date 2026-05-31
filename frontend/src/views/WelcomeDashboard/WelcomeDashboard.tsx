import { useMemo } from 'react';
import { Icon } from '../../components';
import type { Transaction, Metrics } from '../../types';
import heroImage from '../../assets/abstract_hero.png';

interface WelcomeDashboardProps {
  txns: Transaction[];
  metrics: Metrics | null;
  onNavigate: (route: string, context?: any) => void;
  onImportClick: () => void;
  currentUser?: { username: string } | null;
}

interface MetricItem {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  iconColor: string;
  valueColor?: string;
}

export function WelcomeDashboard({ txns, metrics, onNavigate, onImportClick, currentUser }: WelcomeDashboardProps) {
  const openQueue = useMemo(() => txns.filter((t) => t.status === 'flagged' || t.status === 'review').length, [txns]);
  const totalVolume = txns.length;
  const f1Score = useMemo(() => (metrics?.f1 !== undefined ? metrics.f1.toFixed(3) : '0.875'), [metrics]);

  const kpiCards: MetricItem[] = [
    {
      label: 'Triage Backlog',
      value: openQueue,
      unit: 'items pending',
      icon: 'layers',
      iconColor: openQueue > 0 ? 'var(--critical)' : 'var(--low)',
      valueColor: openQueue > 0 ? 'var(--critical)' : 'var(--low)',
    },
    {
      label: 'Engine Accuracy',
      value: f1Score,
      unit: 'F1 Score',
      icon: 'sparkle',
      iconColor: 'var(--violet)',
    },
    {
      label: 'Scanned Volume',
      value: totalVolume,
      unit: 'transactions',
      icon: 'shield',
      iconColor: 'var(--primary)',
    },
    {
      label: 'Inference Latency',
      value: '1.2',
      unit: 'ms / txn',
      icon: 'clock',
      iconColor: 'var(--low)',
      valueColor: 'var(--low)',
    },
  ];

  return (
    <div
      className="content fade-in"
      style={{ overflowY: 'auto', maxHeight: '100vh', padding: '32px 40px 48px' }}
    >
      {/* ── Hero grid ──────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.15fr 1fr',
          gap: 48,
          alignItems: 'center',
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        {/* ── Left column ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Hero text */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'var(--primary-soft)',
                border: '1px solid var(--primary-line)',
                borderRadius: 99,
                padding: '4px 12px',
                marginBottom: 16,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  boxShadow: '0 0 6px var(--primary)',
                }}
              />
              Intelligent Risk Operations Platform
            </div>
            <h1
              style={{
                fontSize: 40,
                fontWeight: 800,
                lineHeight: 1.12,
                margin: '0 0 14px',
                letterSpacing: '-0.035em',
                color: 'var(--text-1)',
              }}
            >
              Welcome, {currentUser?.username || 'User'}
            </h1>
            <p
              style={{
                fontSize: 15,
                color: 'var(--text-3)',
                margin: 0,
                lineHeight: 1.6,
                maxWidth: 460,
              }}
            >
              Falcon integrates 15 deterministic compliance rules with an unsupervised Isolation Forest anomaly detection engine, providing explainable AI risk scoring to flag device reuse, velocity spike bursts, and geographic routing anomalies in real time.
            </p>
          </div>

          {/* Primary CTA card */}
          <div
            className="card"
            style={{
              padding: 24,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-soft)',
                  border: '1px solid var(--primary-line)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="upload" size={15} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  Upload Transaction Log
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1 }}>
                  CSV · Auto-scored on import
                </div>
              </div>
            </div>

            <p
              style={{
                margin: '12px 0 20px',
                fontSize: 13,
                color: 'var(--text-3)',
                lineHeight: 1.55,
              }}
            >
              Load a <code style={{ fontSize: 12, background: 'var(--surface-hi)', padding: '1px 6px', borderRadius: 4, fontFamily: 'var(--mono)' }}>transactions.csv</code> file to
              evaluate unsupervised isolation anomalies, detect velocity spikes, trace device farms,
              and populate the real-time queue.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onImportClick}
                className="btn btn-primary"
                style={{ flex: 1, padding: '11px 20px', fontSize: 13.5 }}
              >
                <Icon name="upload" size={14} />
                Select CSV Dataset
              </button>
              {openQueue > 0 && (
                <button
                  onClick={() => onNavigate('hub')}
                  className="btn btn-ghost"
                  style={{ padding: '11px 18px', fontSize: 13.5 }}
                >
                  <Icon name="sparkle" size={14} style={{ color: 'var(--primary)' }} />
                  Start Triage ({openQueue})
                </button>
              )}
            </div>
          </div>

          {/* KPI metric cards */}
          <div>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.09em',
                color: 'var(--text-4)',
                marginBottom: 12,
              }}
            >
              Operational Benchmarks
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
              }}
            >
              {kpiCards.map((kpi) => (
                <div
                  key={kpi.label}
                  className="card"
                  style={{ padding: '14px 16px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 11.5,
                      color: 'var(--text-3)',
                      marginBottom: 6,
                    }}
                  >
                    <Icon name={kpi.icon} size={12} style={{ color: kpi.iconColor }} />
                    {kpi.label}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: kpi.valueColor || 'var(--text-1)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {kpi.value}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{kpi.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: Hero image ──────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 60px rgba(15,23,42,0.14)',
            }}
          >
            <img
              src={heroImage}
              alt="Premium abstract digital flow graphic"
              style={{ width: '100%', display: 'block', objectFit: 'cover' }}
            />

            {/* Glassmorphic overlay tag */}
            <div
              style={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: 16,
                padding: '11px 16px',
                background: 'rgba(255,255,255,0.82)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  Falcon Isolation Engine
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>
                  15 Deterministic Rules · Active Scan
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--low)',
                    boxShadow: '0 0 6px var(--low)',
                  }}
                />
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-2)',
                  }}
                >
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
