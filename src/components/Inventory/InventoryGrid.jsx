import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRODUCTS, UPGRADES } from '../../utils/gameData';

export default function InventoryGrid() {
  const { shop, listOnMarketplace } = useGame();
  const [listingItem, setListingItem] = useState(null);
  const [listQty, setListQty] = useState(1);
  const [listPrice, setListPrice] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  if (!shop) return null;

  const inventoryItems = Object.values(shop.inventory).filter(item => item.quantity > 0);
  const currentStorage = inventoryItems.reduce((acc, it) => acc + it.quantity, 0);
  const maxStorage = UPGRADES.storage.getCapacity(shop.upgrades.storage);

  const openListModal = (item) => {
    setListingItem(item);
    setListQty(1);
    const product = PRODUCTS[item.productId];
    setListPrice(product ? product.baseSellPrice : 1);
  };

  const handleListSubmit = async (e) => {
    e.preventDefault();
    if (!listingItem) return;
    setSubmitting(true);
    try {
      await listOnMarketplace(listingItem.productId, parseInt(listQty), parseFloat(listPrice));
      setListingItem(null);
    } catch (err) {
      // handled by context toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--text-primary)' }}>Warehouse Inventory</h2>
        <div className="badge badge-common">
          Storage: {currentStorage} / {maxStorage}
        </div>
      </div>

      {inventoryItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ color: 'var(--text-secondary)' }}>Your warehouse is empty.</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Go to the Wholesale Market to restock!</p>
        </div>
      ) : (
        <div className="grid-cols-3">
          {inventoryItems.map(item => {
            const product = PRODUCTS[item.productId];
            if (!product) return null;

            return (
              <div key={item.productId} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ fontSize: '2.5rem' }}>{product.emoji}</div>
                  <div className={`badge badge-${product.rarity}`}>{product.rarity}</div>
                </div>
                <h3 style={{ marginBottom: '0.25rem' }}>{product.name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', flex: 1 }}>{product.description}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Stock</span>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{item.quantity}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  <span>Base Val: ${product.baseSellPrice}</span>
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={() => openListModal(item)}
                >
                  List on Market
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Listing Modal Overlay */}
      {listingItem && (
        <div style={styles.modalOverlay}>
          <div className="card animate-fade-in" style={styles.modalContent}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              List {PRODUCTS[listingItem.productId]?.name}
            </h3>
            
            <form onSubmit={handleListSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity to List (Max: {listingItem.quantity})</label>
                <input 
                  type="number" 
                  className="input" 
                  min="1" 
                  max={listingItem.quantity} 
                  value={listQty}
                  onChange={e => setListQty(e.target.value)}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Price per unit ($)</label>
                <input 
                  type="number" 
                  className="input" 
                  min="0.01" 
                  step="0.01"
                  value={listPrice}
                  onChange={e => setListPrice(e.target.value)}
                  required
                />
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Potential Revenue</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  ${(listQty * listPrice).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setListingItem(null)} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Listing...' : 'Confirm Listing'}
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
