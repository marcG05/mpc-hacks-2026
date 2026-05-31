import { useState, useEffect } from 'react';
import { Icon } from '../../components';
import { fetchConfig, saveConfig, resetConfig, fetchConfigDefaults } from '../../services/api';

// Fallback config for offline development/robustness
const DEFAULT_CONFIG_FALLBACK = {
  weights: {
    flag_amount_zscore: 1.0,
    flag_extreme_zscore: 1.5,
    flag_high_amount: 1.0,
    flag_night_tx: 0.5,
    flag_cross_border: 0.5,
    flag_high_risk_cat: 1.0,
    flag_high_velocity: 1.5,
    flag_burst: 2.5,
    gift_card_spree: 2.5,
    electronics_spree: 2.0,
    flag_round_amount: 0.3,
    flag_many_merchants: 0.5,
    flag_device_multi: 2.0,
    flag_ip_multi: 1.5,
    is_test_charge_pattern: 2.0
  },
  descriptions: {
    flag_high_amount: "Purchase amount is significantly higher than this card's usual spending.",
    flag_amount_zscore: "Transaction amount is highly unusual for this card.",
    flag_night_tx: "Transaction occurred during overnight hours.",
    flag_cross_border: "Purchase was made in merchant country, while cardholder is home.",
    flag_high_velocity: "High transaction activity detected in last hour.",
    flag_burst: "Multiple purchases made in quick succession (15 mins).",
    flag_high_risk_cat: "Purchase made in higher-risk category.",
    gift_card_spree: "Multiple gift card purchases in last 24h.",
    electronics_spree: "Multiple electronics purchases in last 24h.",
    flag_round_amount: "Transaction amount is an exact round value.",
    flag_many_merchants: "Used at unusually large number of merchants.",
    flag_device_multi: "Device associated with multiple cards.",
    flag_ip_multi: "IP address associated with multiple cards.",
    is_test_charge_pattern: "Card-testing pattern: small amount then large charge."
  },
  ensemble: {
    rule_weight: 0.6,
    if_weight: 0.4
  },
  thresholds: {
    suspicious: 0.30,
    fraud: 0.50
  }
};

export function Settings() {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'engine'>('engine');
  
  // Config state
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Profile fields simulator
  const [profile, setProfile] = useState({
    name: 'Lucas Matkovski',
    role: 'Senior Fraud Analyst',
    email: 'lucas.m@hunter.org',
    notifInstant: true,
    notifDaily: false,
    density: 'cozy'
  });

  // Load config on mount
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await fetchConfig();
        // The endpoint may return {ok: true, config: {...}} or direct config json
        if (data && data.weights) {
          setConfig(data);
        } else if (data && data.ok && data.data) {
          setConfig(data.data);
        } else {
          // fallback direct weights parse
          setConfig(data);
        }
      } catch (err) {
        console.warn('Tuner service offline, loading local fallback:', err);
        setConfig(DEFAULT_CONFIG_FALLBACK);
        setErrorMsg('Warning: Tuner service offline. Operating in simulation mode.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await saveConfig(config);
      setSuccessMsg('Engine configuration saved and propagated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Tuner service save failed:', err);
      setErrorMsg('Failed to save configuration to backend tuner service.');
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const data = await resetConfig();
      if (data && data.weights) setConfig(data);
      else if (data && data.ok && data.data) setConfig(data.data);
      setSuccessMsg('Configuration reset to previously saved server config.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Tuner service reset failed:', err);
      // Simulate local reset
      setConfig(DEFAULT_CONFIG_FALLBACK);
      setSuccessMsg('Local configuration reset applied.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDefaults = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const data = await fetchConfigDefaults();
      if (data && data.weights) setConfig(data);
      else if (data && data.ok && data.data) setConfig(data.data);
      setSuccessMsg('Default factory settings loaded.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.warn('Tuner service defaults load failed:', err);
      // Simulate local defaults
      setConfig(DEFAULT_CONFIG_FALLBACK);
      setSuccessMsg('Local factory defaults loaded.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Safe handlers for weight changes
  const updateWeight = (key: string, value: number) => {
    if (!config) return;
    setConfig((prev: any) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: value
      }
    }));
  };

  // Safe handler for threshold changes
  const updateThreshold = (key: 'suspicious' | 'fraud', value: number) => {
    if (!config) return;
    setConfig((prev: any) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [key]: value
      }
    }));
  };

  // Safe handler for ensemble change (balancing rule vs anomaly weight)
  const updateEnsemble = (val: number) => {
    if (!config) return;
    setConfig((prev: any) => ({
      ...prev,
      ensemble: {
        rule_weight: parseFloat(val.toFixed(2)),
        if_weight: parseFloat((1 - val).toFixed(2))
      }
    }));
  };

  if (loading) {
    return (
      <div className="content flex" style={{ height: 'calc(100vh - 60px)', placeItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <Icon name="refresh" size={32} className="spin" style={{ marginBottom: 8 }} />
          <div>Connecting to Engine Tuner server...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="content fade-in" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 60px)', paddingBottom: 40 }}>
      {/* Page Header */}
      <div className="page-head flex between" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <div className="page-sub">Configure user preferences and live-tune engine weights</div>
        </div>
        
        {/* Save/Reset controls */}
        {activeSubTab === 'engine' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleDefaults} disabled={saving}>Restore Defaults</button>
            <button className="btn btn-ghost btn-sm" onClick={handleReset} disabled={saving}>Reset Config</button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #3bb6c4 100%)', border: 0 }}>
              {saving ? 'Saving...' : 'Propagate Config'}
            </button>
          </div>
        )}
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button 
          onClick={() => setActiveSubTab('engine')}
          style={{
            background: 'transparent',
            border: 0,
            borderBottom: activeSubTab === 'engine' ? '2px solid var(--accent)' : 'none',
            color: activeSubTab === 'engine' ? 'var(--text-1)' : 'var(--text-3)',
            padding: '4px 12px',
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer'
          }}
        >
          <Icon name="bolt" size={13} style={{ marginRight: 6 }} /> Engine Tuning & Weights
        </button>
        <button 
          onClick={() => setActiveSubTab('profile')}
          style={{
            background: 'transparent',
            border: 0,
            borderBottom: activeSubTab === 'profile' ? '2px solid var(--accent)' : 'none',
            color: activeSubTab === 'profile' ? 'var(--text-1)' : 'var(--text-3)',
            padding: '4px 12px',
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer'
          }}
        >
          <Icon name="user" size={13} style={{ marginRight: 6 }} /> User Profile & Display
        </button>
      </div>

      {/* Success/Error Banners */}
      {successMsg && (
        <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--low-bg)', border: '1px solid var(--low)', color: 'var(--low)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="check" size={15} /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--critical-bg)', border: '1px solid var(--critical)', color: 'var(--critical)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="info" size={15} /> {errorMsg}
        </div>
      )}

      {activeSubTab === 'engine' && config && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18, alignItems: 'start' }}>
          
          {/* Left Column: Rule Weights */}
          <div className="card" style={{ padding: 20 }}>
            <div className="sec-label" style={{ marginBottom: 16 }}><Icon name="pulse" size={14} /> Rule Weight Tuning (15 Signals)</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(config.weights).map(([key, value]) => {
                const label = key.replace('flag_', '').replace('is_', '').replace(/_/g, ' ');
                const desc = config.descriptions[key] || "Custom signal definition rule.";
                
                return (
                  <div key={key} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
                    <div className="flex between" style={{ marginBottom: 4 }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize', color: 'var(--text-1)' }}>{label}</span>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{desc}</div>
                      </div>
                      <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--accent-hi)' }}>{(value as number).toFixed(1)}</span>
                    </div>
                    
                    <div className="flex" style={{ gap: 10, alignItems: 'center' }}>
                      <input 
                        type="range" 
                        min="0" 
                        max="5" 
                        step="0.1" 
                        value={value as number}
                        onChange={(e) => updateWeight(key, parseFloat(e.target.value))}
                        style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, outline: 'none', cursor: 'pointer' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Thresholds & Ensemble Blends */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Blends */}
            <div className="card" style={{ padding: 18 }}>
              <div className="sec-label" style={{ marginBottom: 14 }}><Icon name="layers" size={13} /> Ensemble Weight Blending</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="flex between" style={{ fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-2)' }}>Rules Weight</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{(config.ensemble?.rule_weight * 100).toFixed(0)}%</span>
                </div>
                <div className="flex between" style={{ fontSize: 12.5 }}>
                  <span style={{ color: 'var(--text-2)' }}>Anomaly Isolation Forest</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{(config.ensemble?.if_weight * 100).toFixed(0)}%</span>
                </div>

                <div style={{ padding: '4px 0' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={config.ensemble?.rule_weight ?? 0.6}
                    onChange={(e) => updateEnsemble(parseFloat(e.target.value))}
                    style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2, outline: 'none', cursor: 'pointer' }}
                  />
                  <div className="flex between" style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 4 }}>
                    <span>100% Isolation Forest</span>
                    <span>100% Rules</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Threshold limits */}
            <div className="card" style={{ padding: 18 }}>
              <div className="sec-label" style={{ marginBottom: 14 }}><Icon name="trend" size={13} /> Threshold Cutoffs</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="flex between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-2)' }}>Suspicious Limit</span>
                    <span className="mono" style={{ color: 'var(--medium)', fontWeight: 600 }}>{(config.thresholds?.suspicious * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={config.thresholds?.suspicious ?? 0.3}
                    onChange={(e) => updateThreshold('suspicious', parseFloat(e.target.value))}
                    style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Scored values above this cutoff move to review queue.</div>
                </div>

                <div>
                  <div className="flex between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-2)' }}>Confirmed Fraud Limit</span>
                    <span className="mono" style={{ color: 'var(--critical)', fontWeight: 600 }}>{(config.thresholds?.fraud * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.01" 
                    value={config.thresholds?.fraud ?? 0.5}
                    onChange={(e) => updateThreshold('fraud', parseFloat(e.target.value))}
                    style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }}
                  />
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Scored values above this cutoff auto-flag as fraud.</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, rgba(77,139,240,0.03) 0%, rgba(77,139,240,0) 100%)', textAlign: 'center' }}>
              <Icon name="shield" size={32} style={{ color: 'var(--accent)', opacity: 0.5, margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600 }}>Real-time Hot Reloading</h4>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
                Changes are written to the main TCP configuration microservice and propagate instantaneously to streaming engine queues.
              </p>
            </div>

          </div>

        </div>
      )}

      {activeSubTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 18, alignItems: 'start' }}>
          
          {/* Profile fields */}
          <div className="card" style={{ padding: 20 }}>
            <div className="sec-label" style={{ marginBottom: 16 }}><Icon name="user" size={14} /> Profile Information</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name} 
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Analyst Title</label>
                  <input 
                    type="text" 
                    value={profile.role} 
                    onChange={(e) => setProfile({...profile, role: e.target.value})}
                    style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Email Address</label>
                <input 
                  type="email" 
                  value={profile.email} 
                  onChange={(e) => setProfile({...profile, email: e.target.value})}
                  style={{ width: '100%', padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: '#fff', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            <div className="card" style={{ padding: 18 }}>
              <div className="sec-label" style={{ marginBottom: 14 }}><Icon name="bell" size={13} /> Incident Alerts</div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <label className="flex" style={{ gap: 8, alignItems: 'center', fontSize: 12.5, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={profile.notifInstant}
                    onChange={(e) => setProfile({...profile, notifInstant: e.target.checked})}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>Instant push alert on Critical risk (F1 score impact)</span>
                </label>

                <label className="flex" style={{ gap: 8, alignItems: 'center', fontSize: 12.5, cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={profile.notifDaily}
                    onChange={(e) => setProfile({...profile, notifDaily: e.target.checked})}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span>Email daily summary of blocked domains</span>
                </label>
              </div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="sec-label" style={{ marginBottom: 14 }}><Icon name="grid" size={13} /> Workspace UI Density</div>
              
              <div style={{ display: 'flex', gap: 6 }}>
                {['comfortable', 'cozy', 'compact'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setProfile({...profile, density: d})}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      fontSize: 11.5,
                      borderRadius: 'var(--radius-sm)',
                      background: profile.density === d ? 'var(--accent-soft)' : 'var(--surface-2)',
                      border: profile.density === d ? '1px solid var(--accent-line)' : '1px solid var(--border)',
                      color: profile.density === d ? 'var(--accent-hi)' : 'var(--text-3)',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
