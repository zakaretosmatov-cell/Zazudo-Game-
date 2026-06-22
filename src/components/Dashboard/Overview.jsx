import React from 'react';
import { useGame } from '../../context/GameContext';
import { UPGRADES } from '../../utils/gameData';
import ShopCanvas from '../GameWorld/ShopCanvas';

export default function Overview({ setActiveTab }) {
  const { shop, salesLogs } = useGame();

  if (!shop) return null;

  const currentStorage = Object.values(shop.inventory).reduce((acc, it) => acc + it.quantity, 0);
  const maxStorage = UPGRADES.storage.getCapacity(shop.upgrades.storage);

  return (
    <div className="animate-fade-in">
      {/* 2D Visual Shop Simulation */}
      <div style={{ marginBottom: '2rem' }}>
        <ShopCanvas />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Dashboard Overview</h2>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Shop established on {new Date(shop.stats.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="grid-cols-4" style={{ marginBottom: '2rem' }}>
        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Total Revenue</div>
          <div style={styles.statValue} className="text-glow-green">
            ${shop.stats.totalEarnings.toLocaleString('en-US', {minimumFractionDigits: 2})}
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Items Sold (All Time)</div>
          <div style={styles.statValue} className="text-glow-blue">
            {shop.stats.totalSalesCount.toLocaleString()}
          </div>
        </div>

        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Warehouse Capacity</div>
          <div style={styles.statValue}>
            <span style={{ color: currentStorage >= maxStorage ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {currentStorage}
            </span> / {maxStorage}
          </div>
          {currentStorage >= maxStorage && (
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '0.25rem' }}>Warehouse Full!</div>
          )}
        </div>

        <div className="card" style={styles.statCard}>
          <div style={styles.statLabel}>Current Upgrades</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div>📦 Storage: Lv.{shop.upgrades.storage}</div>
            <div>📣 Marketing: Lv.{shop.upgrades.marketing}</div>
            <div>✨ Attraction: Lv.{shop.upgrades.attraction}</div>
          </div>
        </div>
      </div>

      <div className="grid-cols-2">
        {/* Quick Actions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Quick Actions</h3>
          
          <button className="btn btn-secondary" onClick={() => setActiveTab('wholesale')} style={{ justifyContent: 'flex-start' }}>
            🏭 Buy Wholesale Inventory
          </button>
          
          <button className="btn btn-secondary" onClick={() => setActiveTab('inventory')} style={{ justifyContent: 'flex-start' }}>
            📦 View Current Stock
          </button>

          <button className="btn btn-primary" onClick={() => setActiveTab('marketplace')} style={{ justifyContent: 'flex-start' }}>
            🤝 Trade on Player Market
          </button>

          <button className="btn btn-secondary" onClick={() => setActiveTab('upgrades')} style={{ justifyContent: 'flex-start' }}>
            📈 Upgrade Shop
          </button>
        </div>

        {/* Live Sales Ticker */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Live Sales Ticker</span>
            <span className="badge badge-uncommon" style={{ fontSize: '0.65rem' }}>🟢 ACTIVE</span>
          </h3>
          
          <div style={styles.tickerContainer}>
            {salesLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                Waiting for customers...<br/>
                <small>Buy items from wholesale to attract AI buyers!</small>
              </div>
            ) : (
              salesLogs.map(log => (
                <div key={log.id} style={styles.logEntry} className="animate-fade-in">
                  <div style={styles.logIcon}>{log.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      Customer bought <b>{log.quantity}x {log.productName}</b>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.timestamp}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>+${log.revenue}</div>
                    <div style={{ color: 'var(--accent-blue)', fontSize: '0.75rem' }}>+{log.xpGained} XP</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem'
  },
  statValue: {
    fontSize: '1.8rem',
    fontWeight: '800'
  },
  tickerContainer: {
    flex: 1,
    overflowY: 'auto',
    maxHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  logEntry: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(255,255,255,0.02)'
  },
  logIcon: {
    fontSize: '1.5rem'
  }
};
