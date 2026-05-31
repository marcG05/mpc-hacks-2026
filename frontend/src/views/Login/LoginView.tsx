import { useState } from 'react';
import { Icon } from '../../components';
import { loginUser } from '../../services/api';

interface LoginViewProps {
  onLoginSuccess: (user: { username: string }) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await loginUser({ username, password });
      if (res.ok && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Invalid username or password');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Connection to backend engine failed. Verify the api service is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Dynamic Background Glows */}
      <div className="login-glow-1"></div>
      <div className="login-glow-2"></div>
      
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="login-brand-mark">
            <Icon name="shield" size={24} style={{ color: '#fff' }} />
          </div>
          <h1 className="login-title">Fraud Hunter</h1>
          <p className="login-subtitle">Risk Operations Console</p>
        </div>

        {error && (
          <div className="login-error-banner flex">
            <Icon name="info" size={16} style={{ color: 'var(--critical)', flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <Icon name="user" size={16} />
              </span>
              <input
                id="username"
                type="text"
                className="form-input"
                placeholder="Enter username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <span className="input-icon">
                <Icon name="bolt" size={16} />
              </span>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="flex" style={{ gap: 8, justifyContent: 'center' }}>
                <Icon name="refresh" size={16} className="spin" /> Authenticating...
              </span>
            ) : (
              <span className="flex" style={{ gap: 8, justifyContent: 'center' }}>
                Access Console <Icon name="arrowRight" size={16} />
              </span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="hint-box">
            <div className="hint-header flex">
              <Icon name="info" size={13} style={{ color: 'var(--accent-hi)' }} />
              <span>Default Credentials</span>
            </div>
            <p className="hint-text">
              Sign in with <strong>Marc</strong> and password <strong>1234</strong>
            </p>
          </div>
          <div className="system-status flex">
            <span className="status-dot online"></span>
            <span>Security Gateway Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
