import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';

export default function AuthScreen() {
  const { login, register, error } = useGame();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !displayName)) {
      setLocalErr('Please fill out all required fields.');
      return;
    }
    setLocalErr('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setLocalErr(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoAccess = async (role) => {
    setSubmitting(true);
    setLocalErr('');
    try {
      if (role === 'tycoon') {
        await login('tycoon@zazudo.io', 'demo123');
      } else {
        await login('newbie@zazudo.io', 'demo123');
      }
    } catch (err) {
      setLocalErr(err.message || 'Demo access failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.authContainer} className="animate-fade-in">
      <div style={styles.brandingSection}>
        <div style={styles.logoBadge}>ZAZUDO</div>
        <h1 style={styles.brandTitle}>Business Tycoon</h1>
        <p style={styles.brandSubtitle}>
          Build, upgrade, and trade in a real-time multiplayer player-to-player economic simulation.
        </p>
      </div>

      <div className="card" style={styles.authCard}>
        <h2 style={styles.cardHeader}>{isRegister ? 'Start Your Shop' : 'Manager Sign In'}</h2>
        
        {(localErr || error) && (
          <div style={styles.errorBanner}>
            ⚠️ {localErr || error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Shop Name / Display Name</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. MegaCorp, RetroShop"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? 'Connecting...' : isRegister ? 'Establish Franchise' : 'Authenticate Manager'}
          </button>
        </form>

        <div style={styles.toggleText}>
          {isRegister ? 'Already managing a shop?' : 'New entrepreneur?'}
          <span
            style={styles.toggleLink}
            onClick={() => {
              setIsRegister(!isRegister);
              setLocalErr('');
            }}
          >
            {isRegister ? ' Sign In' : ' Create Shop'}
          </span>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>Developer Sandbox Quick Play</span>
        </div>

        <div style={styles.demoButtonsContainer}>
          <button
            onClick={() => handleDemoAccess('newbie')}
            className="btn btn-secondary"
            style={styles.demoBtn}
            disabled={submitting}
          >
            🌱 Newbie Demo Shop
          </button>
          <button
            onClick={() => handleDemoAccess('tycoon')}
            className="btn btn-secondary"
            style={styles.demoBtn}
            disabled={submitting}
          >
            ⚡ Tycoon Demo Shop
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  authContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem 1.5rem',
    background: 'radial-gradient(circle at top right, rgba(59, 130, 246, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.06), transparent 30%)'
  },
  brandingSection: {
    textAlign: 'center',
    marginBottom: '2rem',
    maxWidth: '480px'
  },
  logoBadge: {
    display: 'inline-block',
    fontSize: '0.8rem',
    fontWeight: '800',
    color: '#090d16',
    background: 'linear-gradient(90deg, #10b981, #3b82f6)',
    padding: '0.2rem 0.8rem',
    borderRadius: '10px',
    letterSpacing: '0.15em',
    marginBottom: '0.75rem',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
  },
  brandTitle: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '-0.03em'
  },
  brandSubtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4'
  },
  authCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '2.2rem 2rem'
  },
  cardHeader: {
    fontSize: '1.4rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
    color: 'var(--text-primary)',
    textAlign: 'center'
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    marginBottom: '1.25rem',
    fontSize: '0.85rem'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.15rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem'
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.03em'
  },
  submitBtn: {
    marginTop: '0.5rem',
    padding: '0.8rem'
  },
  toggleText: {
    textAlign: 'center',
    marginTop: '1.25rem',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)'
  },
  toggleLink: {
    color: 'var(--accent-blue)',
    cursor: 'pointer',
    fontWeight: '600'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '1.5rem 0',
    color: 'var(--text-muted)'
  },
  dividerText: {
    width: '100%',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0 0.5rem',
    borderBottom: '1px solid var(--border-color)',
    lineHeight: '0.1em',
    margin: '10px 0 20px'
  },
  demoButtonsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  demoBtn: {
    width: '100%',
    justifyContent: 'center',
    fontSize: '0.85rem'
  }
};
