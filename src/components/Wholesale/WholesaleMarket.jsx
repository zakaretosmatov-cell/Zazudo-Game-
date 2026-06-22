import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRODUCTS, UPGRADES } from '../../utils/gameData';

export default function WholesaleMarket() {
  const { shop, buyFromWholesale, showToast } = useGame();
  const [purchaseItem, setPurchaseItem] = useState(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  if (!shop) return null;

  const currentStorage = Object.values(shop.inventory).reduce((acc, it) => acc + it.quantity, 0);
  const maxStorage = UPGRADES.storage.getCapacity(shop.upgrades.storage);
  const availableStorage = maxStorage - currentStorage;

  const openPurchaseModal = (product) => {
    if (shop.level < product.minLevel) {
      showToast(`Requires Shop Level ${product.minLevel} to purchase this item.`, 'error');
      return;
    }
    setPurchaseItem(product);
    setPurchaseQty(1);
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseItem) return;
    setSubmitting(true);
    try {
      await buyFromWholesale(purchaseItem.id, parseInt(purchaseQty));
      setPurchaseItem(null);
    } catch (err) {
      // handled by context toast or we can set local
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)' }}>System Wholesale Supply</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Purchase raw inventory here to stock your warehouse.
          </p>
        </div>
        <div className="badge badge-common">
          Storage Available: {availableStorage}
        </div>
      </div>

      <div className="grid-cols-4">
        {Object.values(PRODUCTS).map(product => {
          const isLocked = shop.level < product.minLevel;
          
          return (
            <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', opacity: isLocked ? 0.6 : 1, position: 'relative' }}>
              {isLocked && (
                <div style={styles.lockOverlay}>
                  <span>🔒 Level {product.minLevel} Required</span>
                </div>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ fontSize: '2.5rem' }}>{product.emoji}</div>
                <div className={`badge badge-${product.rarity}`}>{product.rarity}</div>
              </div>
              
              <h3 style={{ marginBottom: '0.25rem' }}>{product.name}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', flex: 1 }}>{product.description}</p>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Wholesale Price</span>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-primary)' }}>${product.baseBuyPrice}</span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                Retail Val: ~${product.baseSellPrice}
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={() => openPurchaseModal(product)}
                disabled={isLocked}
              >
                Buy Stock
              </button>
            </div>
          );
        })}
      </div>

      {/* Purchase Modal Overlay */}
      {purchaseItem && (
        <div style={styles.modalOverlay}>
          <div className="card animate-fade-in" style={styles.modalContent}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Buy {purchaseItem.name}</span>
              <span>📦 {availableStorage} space left</span>
            </h3>
            
            <form onSubmit={handlePurchaseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Order Quantity</label>
                <input 
                  type="number" 
                  className="input" 
                  min="1" 
                  max={availableStorage} 
                  value={purchaseQty}
                  onChange={e => setPurchaseQty(e.target.value)}
                  required
                />
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Order Cost</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                  ${(purchaseQty * purchaseItem.baseBuyPrice).toFixed(2)}
                </div>
                {shop.balance < (purchaseQty * purchaseItem.baseBuyPrice) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', marginTop: '0.25rem' }}>
                    Insufficient funds! Your balance is ${shop.balance.toFixed(2)}.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPurchaseItem(null)} disabled={submitting}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  style={{ flex: 1 }} 
                  disabled={submitting || shop.balance < (purchaseQty * purchaseItem.baseBuyPrice) || purchaseQty > availableStorage}
                >
                  {submitting ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.7)',
    backdropFilter: 'blur(2px)',
    zIndex: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    fontSize: '0.9rem'
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
    textTransform: 'uppercase'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalContent: {
    width: '100%',
    maxWidth: '450px',
    padding: '2rem'
  }
};
