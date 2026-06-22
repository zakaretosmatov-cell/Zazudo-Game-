import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'overview', label: '📊 Overview' },
    { id: 'inventory', label: '📦 Inventory' },
    { id: 'wholesale', label: '🏭 Wholesale Market' },
    { id: 'marketplace', label: '🤝 Player Market' },
    { id: 'upgrades', label: '📈 Upgrades' },
    { id: 'leaderboard', label: '🏆 Leaderboard' }
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.navContainer}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              ...styles.navItem,
              ...(activeTab === item.id ? styles.activeNavItem : {})
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={styles.sidebarFooter}>
        <div style={styles.versionInfo}>v0.1.0 (Simulation)</div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '240px',
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 0',
    minHeight: 'calc(100vh - 80px)' // approx header height deduction
  },
  navContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '0 1rem',
    flex: 1
  },
  navItem: {
    padding: '0.8rem 1rem',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-secondary)',
    textAlign: 'left',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '500',
    transition: 'all var(--transition-fast)',
    fontFamily: 'var(--font-family-body)'
  },
  activeNavItem: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: 'var(--accent-blue)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    textShadow: '0 0 10px var(--accent-blue-glow)',
    fontWeight: '600'
  },
  sidebarFooter: {
    padding: '1rem',
    textAlign: 'center',
    borderTop: '1px solid var(--border-color)',
    marginTop: 'auto'
  },
  versionInfo: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)'
  }
};
