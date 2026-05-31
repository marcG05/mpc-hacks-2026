import { useState } from 'react';
import { Icon } from '../../components';

export function Resources() {
  // Simulators states
  const [ipInput, setIpInput] = useState('184.22.91.4');
  const [ipResult, setIpResult] = useState<any>(null);
  const [ipLoading, setIpLoading] = useState(false);

  const [binInput, setBinInput] = useState('411111');
  const [binResult, setBinResult] = useState<any>(null);
  const [binLoading, setBinLoading] = useState(false);

  const [emailInput, setEmailInput] = useState('lucas@domain.com');
  const [emailResult, setEmailResult] = useState<any>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // active helper tab
  const [activeTool, setActiveTool] = useState<'ip' | 'bin' | 'email'>('ip');

  // Handle IP lookup
  const runIpLookup = () => {
    setIpLoading(true);
    setIpResult(null);
    setTimeout(() => {
      setIpLoading(false);
      setIpResult({
        ip: ipInput,
        country: 'Canada',
        countryCode: 'CA',
        city: 'Montreal',
        isp: 'Bell Canada',
        vpn: true,
        tor: false,
        proxy: true,
        riskScore: 82,
        connection: 'Hosting / Data Center'
      });
    }, 600);
  };

  // Handle BIN check
  const runBinCheck = () => {
    setBinLoading(true);
    setBinResult(null);
    setTimeout(() => {
      setBinLoading(false);
      setBinResult({
        bin: binInput,
        brand: 'Visa',
        type: 'Credit',
        category: 'Signature / Platinum',
        bank: 'Royal Bank of Canada (RBC)',
        country: 'Canada',
        iso: 'CA',
        prepaid: false
      });
    }, 600);
  };

  // Handle Email Verification
  const runEmailVerification = () => {
    setEmailLoading(true);
    setEmailResult(null);
    setTimeout(() => {
      setEmailLoading(false);
      
      const isDisposable = /temp|mailinator|trash/i.test(emailInput);
      const isFree = /gmail|yahoo|outlook|hotmail/i.test(emailInput);

      setEmailResult({
        email: emailInput,
        valid: true,
        deliverable: true,
        disposable: isDisposable,
        freeProvider: isFree,
        mxRecords: 'mx1.mail.domain.com (10)',
        smtpCheck: 'Success',
        score: isDisposable ? 15 : isFree ? 90 : 98
      });
    }, 600);
  };

  // Manuals list
  const manuals = [
    { title: 'ACFE Fraud Manual (2025)', category: 'Manual', desc: 'Standard guide detailing modern card fraud patterns, identity theft schemes, and legal prosecution flows.' },
    { title: 'FATF Virtual Asset Guidance', category: 'Compliance', desc: 'Financial Action Task Force recommendations for tracking cross-chain crypto exchanges and laundering risks.' },
    { title: 'PCI DSS v4.0 Quick Reference', category: 'Security Standards', desc: 'Interactive compliance checklist for cardholder data environments (CDE) and cryptographic keys handling.' },
    { title: 'Mastercard Reason Codes Deskbook', category: 'Chargebacks', desc: 'Guide to dispute reason codes (e.g. Code 4837: No Cardholder Authorization) and merchant defense strategies.' }
  ];

  return (
    <div className="content fade-in" style={{ overflowY: 'auto', maxHeight: '100vh', paddingBottom: 40 }}>
      {/* Page Header */}
      <div className="page-head" style={{ marginBottom: 24 }}>
        <h1 className="page-title">Resources & Tools</h1>
        <div className="page-sub">External research manuals, databases, and analyst lookup tools</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }}>
        
        {/* Left Column: Interactive Simulators */}
        <div className="card" style={{ padding: 20 }}>
          <div className="flex between" style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            <div className="sec-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="probe" size={14} /> Analyst Quick Lookup Tools
            </div>
            
            {/* Tool selectors */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button 
                onClick={() => setActiveTool('ip')}
                style={{ 
                  background: activeTool === 'ip' ? 'var(--accent-soft)' : 'transparent',
                  border: 0, 
                  borderRadius: 4, 
                  color: activeTool === 'ip' ? 'var(--accent-hi)' : 'var(--text-3)',
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                IP Lookup
              </button>
              <button 
                onClick={() => setActiveTool('bin')}
                style={{ 
                  background: activeTool === 'bin' ? 'var(--accent-soft)' : 'transparent',
                  border: 0, 
                  borderRadius: 4, 
                  color: activeTool === 'bin' ? 'var(--accent-hi)' : 'var(--text-3)',
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                BIN Check
              </button>
              <button 
                onClick={() => setActiveTool('email')}
                style={{ 
                  background: activeTool === 'email' ? 'var(--accent-soft)' : 'transparent',
                  border: 0, 
                  borderRadius: 4, 
                  color: activeTool === 'email' ? 'var(--accent-hi)' : 'var(--text-3)',
                  padding: '4px 8px',
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Email Verify
              </button>
            </div>
          </div>

          {/* IP TOOL PANEL */}
          {activeTool === 'ip' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input 
                  type="text" 
                  value={ipInput} 
                  onChange={(e) => setIpInput(e.target.value)} 
                  placeholder="Enter IP (e.g. 184.22.91.4)..."
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', outline: 'none' }}
                />
                <button className="btn btn-primary" onClick={runIpLookup} disabled={ipLoading}>
                  {ipLoading ? 'Scanning...' : 'Lookup'}
                </button>
              </div>

              {ipResult && (
                <div style={{ background: 'var(--surface-hi)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div className="flex between" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>IP Metadata Output</span>
                    <span className="mono" style={{ color: ipResult.vpn ? 'var(--critical)' : 'var(--low)', fontSize: 11.5 }}>
                      {ipResult.vpn ? 'VPN Detected' : 'Clean IP'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                    <div><span style={{ color: 'var(--text-3)' }}>Location</span>: {ipResult.city}, {ipResult.country} ({ipResult.countryCode})</div>
                    <div><span style={{ color: 'var(--text-3)' }}>ISP</span>: {ipResult.isp}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Connection Type</span>: {ipResult.connection}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Tor Exit Node</span>: {ipResult.tor ? 'Yes' : 'No'}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Proxy / Tunnel</span>: {ipResult.proxy ? 'Yes' : 'No'}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Fraud Score</span>: <span className="mono" style={{ color: 'var(--critical)', fontWeight: 600 }}>{ipResult.riskScore}/100</span></div>
                  </div>
                </div>
              )}

              {!ipResult && !ipLoading && (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                  Enter any IP address to perform reverse DNS, geolocation, and VPN/Proxy risk score screening.
                </div>
              )}
            </div>
          )}

          {/* BIN TOOL PANEL */}
          {activeTool === 'bin' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input 
                  type="text" 
                  maxLength={8}
                  value={binInput} 
                  onChange={(e) => setBinInput(e.target.value.replace(/\D/g,''))} 
                  placeholder="Enter 6-8 digit BIN..."
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', outline: 'none' }}
                />
                <button className="btn btn-primary" onClick={runBinCheck} disabled={binLoading}>
                  {binLoading ? 'Querying...' : 'Query'}
                </button>
              </div>

              {binResult && (
                <div style={{ background: 'var(--surface-hi)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div className="flex between" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>BIN Database Result</span>
                    <span className="mono" style={{ color: 'var(--accent-hi)', fontSize: 11.5 }}>
                      {binResult.brand} - {binResult.type}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                    <div><span style={{ color: 'var(--text-3)' }}>Issuer Bank</span>: {binResult.bank}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Origin Country</span>: {binResult.country} ({binResult.iso})</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Product Tier</span>: {binResult.category}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Is Prepaid Card</span>: {binResult.prepaid ? 'Yes' : 'No'}</div>
                  </div>
                </div>
              )}

              {!binResult && !binLoading && (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                  Query a Bank Identification Number (BIN/IIN) to verify the card brand, tier, issuing institution, and geographical origin.
                </div>
              )}
            </div>
          )}

          {/* EMAIL TOOL PANEL */}
          {activeTool === 'email' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input 
                  type="email" 
                  value={emailInput} 
                  onChange={(e) => setEmailInput(e.target.value)} 
                  placeholder="Enter email (e.g. name@domain.com)..."
                  style={{ flex: 1, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', outline: 'none' }}
                />
                <button className="btn btn-primary" onClick={runEmailVerification} disabled={emailLoading}>
                  {emailLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>

              {emailResult && (
                <div style={{ background: 'var(--surface-hi)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div className="flex between" style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>Email Verification Status</span>
                    <span className="mono" style={{ color: emailResult.disposable ? 'var(--critical)' : 'var(--low)', fontSize: 11.5 }}>
                      {emailResult.disposable ? 'Disposable Domain' : 'Deliverable'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12.5 }}>
                    <div><span style={{ color: 'var(--text-3)' }}>Deliverable</span>: {emailResult.deliverable ? 'Yes' : 'No'}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>MX Record Found</span>: {emailResult.mxRecords}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>SMTP Handshake</span>: {emailResult.smtpCheck}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Disposable Inbox</span>: {emailResult.disposable ? 'Yes' : 'No'}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Free Provider</span>: {emailResult.freeProvider ? 'Yes' : 'No'}</div>
                    <div><span style={{ color: 'var(--text-3)' }}>Deliverability Score</span>: <span className="mono" style={{ color: emailResult.score < 50 ? 'var(--critical)' : 'var(--low)', fontWeight: 600 }}>{emailResult.score}%</span></div>
                  </div>
                </div>
              )}

              {!emailResult && !emailLoading && (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-3)' }}>
                  Verify deliverability, check MX record availability, query disposable domains, and calculate customer trust scores.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Reference Materials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          <div className="card" style={{ padding: 20 }}>
            <div className="sec-label" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="list" size={14} style={{ color: 'var(--violet)' }} /> Compliance Reference Materials
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {manuals.map((m, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="flex between" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{m.title}</span>
                    <span 
                      style={{ 
                        fontSize: 9.5, 
                        fontWeight: 600,
                        padding: '1px 5px', 
                        borderRadius: 3, 
                        background: 'var(--border)', 
                        color: 'var(--text-3)' 
                      }}
                    >
                      {m.category}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.45 }}>{m.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: 'linear-gradient(135deg, rgba(167,139,250,0.03) 0%, rgba(167,139,250,0) 100%)', textAlign: 'center' }}>
            <Icon name="info" size={32} style={{ color: 'var(--violet)', opacity: 0.5, margin: '0 auto 8px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600 }}>Continuous Integration</h4>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>
              To suggest new compliance manuals, place markdown files into `/documentation/manuals/` directory. The engine will ingest them automatically.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
