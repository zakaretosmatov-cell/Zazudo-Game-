import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { UPGRADES } from '../../utils/gameData';

export default function UpgradesPanel() {
  const { shop, upgradeShop } = useGame();
  const [submitting, setSubmitting] = useState(false);

  if (!shop) return null;

  const handleUpgrade = async (key) => {
    setSubmitting(true);
    try {
      await upgradeShop(key);
    } catch (e) {
      // toast handles it
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Business Upgrades</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Reinvest your profits to grow your empire.
        </p>
      </div>

      <div className="grid-cols-3">
        {Object.entries(UPGRADES).map(([key, config]) => {
          const currentLvl = shop.upgrades[key] || 1;
          const cost = Math.round(config.baseCost * Math.pow(config.costMultiplier, currentLvl - 1));
          const canAfford = shop.balance >= cost;

          // Determine current/next stats
          let statDisplay = null;
          if (key === 'storage') {
            statDisplay = `Cap: ${config.getCapacity(currentLvl)} ➔ ${config.getCapacity(currentLvl + 1)}`;
          } else if (key === 'marketing') {
            statDisplay = `Visit: ${config.getVisitInterval(currentLvl)}s ➔ ${config.getVisitInterval(currentLvl + 1)}s`;
          } else if (key === 'attraction') {
            statDisplay = `Markup: ${Math.round(config.getMaxPriceMarkup(currentLvl)*100)}% ➔ ${Math.round(config.getMaxPriceMarkup(currentLvl + 1)*100)}%`;
          }

          return (
            <div key={key} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem' }}>{config.emoji}</div>
                <div className="badge badge-rare">Level {currentLvl}</div>
              </div>
              
              <h3 style={{ marginBottom: '0.25rem' }}>{config.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', flex: 1 }}>{config.description}</p>
              
              <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {statDisplay}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Upgrade Cost</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: canAfford ? 'var(--text-primary)' : 'var(--accent-red)' }}>${cost.toLocaleString()}</span>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => handleUpgrade(key)}
                disabled={!canAfford || submitting}
              >
                {canAfford ? 'Purchase Upgrade' : 'Insufficient Funds'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
