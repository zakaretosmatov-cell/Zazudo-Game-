import React, { useEffect, useState } from 'react';
import { useGame } from '../../context/GameContext';

export default function Header() {
  const { shop, logout, soundEnabled, toggleSound } = useGame();
  const [balanceClass, setBalanceClass] = useState('');
  const [xpClass, setXpClass] = useState('');
  const [prevBalance, setPrevBalance] = useState(0);
  const [prevXp, setPrevXp] = useState(0);

  useEffect(() => {
    if (!shop) return;
    if (prevBalance && shop.balance > prevBalance) {
      setBalanceClass('money-flash');
      const t = setTimeout(() => setBalanceClass(''), 1000);
      return () => clearTimeout(t);
    }
    setPrevBalance(shop.balance);
  }, [shop?.balance]);

  useEffect(() => {
    if (!shop) return;
    if (prevXp && shop.xp > prevXp) {
      setXpClass('xp-flash');
      const t = setTimeout(() => setXpClass(''), 1000);
      return () => clearTimeout(t);
    }
    setPrevXp(shop.xp);
  }, [shop?.xp]);

  if (!shop) return null;

  const xpPercent = Math.min(100, Math.round((shop.xp / shop.xpToNextLevel) * 100));

  return (
    <header style={styles.header}>
      <div style={styles.brandGroup}>
        <h2 style={styles.shopName}>🏬 {shop.name}</h2>
        <div style={styles.levelBadge}>
          LVL <span style={styles.levelText}>{shop.level}</span>
        </div>
      </div>

      <div style={styles.xpWrapper}>
        <div style={styles.xpLabel}>
          XP: <span className={xpClass}>{shop.xp}</span> / {shop.xpToNextLevel}
        </div>
        <div style={styles.xpBarContainer}>
          <div style={{ ...styles.xpBarFill, width: `${xpPercent}%` }}></div>
        </div>
      </div>

      <div style={styles.statsGroup}>
        <div style={styles.balanceContainer}>
          <span style={styles.balanceLabel}>Net Funds</span>
          <h2 style={styles.balanceValue} className={`text-glow-green ${balanceClass}`}>
            ${shop.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
        </div>

        <div style={styles.actionGroup}>
          <button 
            onClick={toggleSound} 
            className="btn btn-secondary" 
            style={styles.headerBtn}
            title={soundEnabled ? "Mute Game Sounds" : "Enable Game Sounds"}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
          
          <button onClick={logout} className="btn btn-danger" style={styles.headerBtn}>
            🚪 Sign Out
          </button>
        </div>
      </div>
      
      <style>{`
        .money-flash {
          animation: moneyUp 0.6s ease;
        }
        .xp-flash {
          animation: xpUp 0.6s ease;
        }
      `}</style>
    </header>
  );
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 2rem',
    background: 'var(--glass-bg)',
    borderBottom: '1px solid var(--border-color)',
    backdropFilter: 'var(--glass-blur)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  shopName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)'
  },
  levelBadge: {
    backgroundColor: 'var(--accent-blue-glow)',
    border: '1px solid var(--accent-blue)',
    color: '#60a5fa',
    padding: '0.15rem 0.6rem',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: '800',
    letterSpacing: '0.05em'
  },
  levelText: {
    color: 'var(--text-primary)',
    fontSize: '0.85rem'
  },
  xpWrapper: {
    flex: '1',
    maxWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    padding: '0 1rem'
  },
  xpLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '600'
  },
  xpBarContainer: {
    height: '6px',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: 'var(--radius-full)',
    overflow: 'hidden',
    border: '1px solid var(--border-color)'
  },
  xpBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-purple) 100%)',
    borderRadius: 'var(--radius-full)',
    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  statsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap'
  },
  balanceContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  balanceLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  balanceValue: {
    fontSize: '1.4rem',
    fontWeight: '800',
    letterSpacing: '-0.02em'
  },
  actionGroup: {
    display: 'flex',
    gap: '0.5rem'
  },
  headerBtn: {
    padding: '0.5rem 0.8rem',
    fontSize: '0.85rem'
  }
};
