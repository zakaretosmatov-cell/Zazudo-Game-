import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import { PRODUCTS, UPGRADES } from '../../utils/gameData';

export default function MarketplaceBoard() {
  const { currentUser, shop, marketplaceListings, purchaseMarketplaceListing, cancelMarketplaceListing, showToast } = useGame();
  const [purchaseListing, setPurchaseListing] = useState(null);
  const [buyQty, setBuyQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' or 'myListings'

  if (!currentUser || !shop) return null;

  const listingsArray = Object.values(marketplaceListings || {}).filter(l => l.status === 'active');
  const myListings = listingsArray.filter(l => l.sellerId === currentUser.uid);
  const otherListings = listingsArray.filter(l => l.sellerId !== currentUser.uid);

  // Sort by newest first
  otherListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  myListings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const currentStorage = Object.values(shop.inventory).reduce((acc, it) => acc + it.quantity, 0);
  const maxStorage = UPGRADES.storage.getCapacity(shop.upgrades.storage);
  const availableStorage = maxStorage - currentStorage;

  const openBuyModal = (listing) => {
    setPurchaseListing(listing);
    setBuyQty(1);
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();
    if (!purchaseListing) return;
    setSubmitting(true);
    try {
      await purchaseMarketplaceListing(purchaseListing.id, parseInt(buyQty));
      setPurchaseListing(null);
    } catch (err) {
      // toast handles error message
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (listingId) => {
    if (window.confirm('Cancel this listing and return items to inventory?')) {
      await cancelMarketplaceListing(listingId);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)' }}>Player Marketplace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Buy and sell goods with other virtual businesses.
          </p>
        </div>
      </div>

      <div className="tabs">
        <button 
          className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveTab('browse')}
        >
          Browse Offers ({otherListings.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'myListings' ? 'active' : ''}`}
          onClick={() => setActiveTab('myListings')}
        >
          My Active Listings ({myListings.length})
        </button>
      </div>

      {activeTab === 'browse' && (
        <>
          {otherListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <h3 style={{ color: 'var(--text-secondary)' }}>No active listings right now.</h3>
              <p style={{ color: 'var(--text-muted)' }}>Check back later or list your own items!</p>
            </div>
          ) : (
            <div className="grid-cols-3">
              {otherListings.map(listing => {
                const product = PRODUCTS[listing.productId];
                return (
                  <div key={listing.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="badge badge-common" style={{ fontSize: '0.65rem' }}>{listing.sellerShopName}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(listing.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '2.5rem' }}>{product?.emoji || '📦'}</div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem' }}>{listing.productName}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stock: {listing.quantity} available</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Price / Unit</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--accent-green)' }}>${listing.pricePerUnit.toFixed(2)}</span>
                    </div>

                    <button className="btn btn-primary" onClick={() => openBuyModal(listing)}>
                      Purchase
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'myListings' && (
        <>
          {myListings.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <h3 style={{ color: 'var(--text-secondary)' }}>You have no active listings.</h3>
              <p style={{ color: 'var(--text-muted)' }}>Go to your Inventory to list items for sale.</p>
            </div>
          ) : (
            <div className="grid-cols-3">
              {myListings.map(listing => {
                const product = PRODUCTS[listing.productId];
                return (
                  <div key={listing.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontSize: '2.5rem' }}>{product?.emoji || '📦'}</div>
                      <div>
                        <h3 style={{ fontSize: '1.1rem' }}>{listing.productName}</h3>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Listed: {listing.quantity}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Asking Price</span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--text-primary)' }}>${listing.pricePerUnit.toFixed(2)}</span>
                    </div>

                    <button className="btn btn-danger" onClick={() => handleCancel(listing.id)}>
                      Cancel & Return to Stock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Purchase Modal */}
      {purchaseListing && (
        <div style={styles.modalOverlay}>
          <div className="card animate-fade-in" style={styles.modalContent}>
            <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              Buy {purchaseListing.productName}
            </h3>
            
            <form onSubmit={handleBuySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity to Buy (Max {purchaseListing.quantity})</label>
                <input 
                  type="number" 
                  className="input" 
                  min="1" 
                  max={Math.min(purchaseListing.quantity, availableStorage)} 
                  value={buyQty}
                  onChange={e => setBuyQty(e.target.value)}
                  required
                />
              </div>

              {availableStorage < purchaseListing.quantity && (
                 <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)' }}>
                   Note: You only have space for {availableStorage} more items.
                 </div>
              )}

              <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-sm)', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Payment</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  ${(buyQty * purchaseListing.pricePerUnit).toFixed(2)}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPurchaseListing(null)} disabled={submitting}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success" 
                  style={{ flex: 1 }} 
                  disabled={submitting || buyQty > availableStorage || shop.balance < (buyQty * purchaseListing.pricePerUnit)}
                >
                  {submitting ? 'Processing...' : 'Confirm Trade'}
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
