import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { authService, dbService } from '../utils/firebase';
import { PRODUCTS, UPGRADES } from '../utils/gameData';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

// Web Audio API Synthesizer helper for sound effects (Premium gaming feel)
const playSynthBeep = (type = 'success') => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'success') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.35);
    } else if (type === 'upgrade') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(261.63, audioCtx.currentTime); // C4
      oscillator.frequency.setValueAtTime(392.00, audioCtx.currentTime + 0.08); // G4
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime + 0.16); // C5
      oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.24); // C6
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.45);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.45);
    } else if (type === 'sale') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } else if (type === 'error') {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.25);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio Context blocked or not supported
  }
};

export const GameProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [marketplaceListings, setMarketplaceListings] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [salesLogs, setSalesLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const customerTimerRef = useRef(null);
  const [isVisualSimulationActive, setIsVisualSimulationActive] = useState(false);

  // Show floating notifications helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sound settings (stored in state & storage)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('zazudo_sound_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('zazudo_sound_enabled', JSON.stringify(newValue));
    if (newValue) playSynthBeep('success');
  };

  const triggerSound = (type) => {
    if (soundEnabled) playSynthBeep(type);
  };

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = authService.subscribeAuth((user) => {
      setCurrentUser(user);
      if (!user) {
        setShop(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Shop Data & Leaderboard Subscription
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);

    // Subscribe to shop
    const unsubscribeShop = dbService.subscribeShop(currentUser.uid, (shopData) => {
      setShop(shopData);
      setLoading(false);
    });

    // Subscribe to marketplace
    const unsubscribeMarket = dbService.subscribeMarketplace((marketData) => {
      setMarketplaceListings(marketData);
    });

    // Subscribe to leaderboard
    const unsubscribeLeaderboard = dbService.subscribeLeaderboard((leadData) => {
      setLeaderboard(leadData);
    });

    // Subscribe to recent sales logs
    const unsubscribeLogs = dbService.subscribeSalesLogs((logs) => {
      setSalesLogs(logs);
    });

    return () => {
      unsubscribeShop();
      unsubscribeMarket();
      unsubscribeLeaderboard();
      unsubscribeLogs();
    };
  }, [currentUser]);

  // JIT Offline Earnings Calculator on login
  useEffect(() => {
    if (!shop || !currentUser) return;

    const lastUpdated = new Date(shop.updatedAt).getTime();
    const elapsedSeconds = Math.floor((Date.now() - lastUpdated) / 1000);

    // If they have been gone for more than 2 minutes, calculate passive sales
    if (elapsedSeconds > 120) {
      const marketingLevel = shop.upgrades.marketing;
      const interval = UPGRADES.marketing.getVisitInterval(marketingLevel);
      const possibleVisits = Math.min(100, Math.floor(elapsedSeconds / interval)); // Limit to max 100 offline ticks to avoid spam

      if (possibleVisits > 0) {
        let totalRevenue = 0;
        let totalQtySold = 0;
        let totalXpGained = 0;
        let salesCount = 0;

        // Perform mock iterations on their inventory
        const tempInventory = JSON.parse(JSON.stringify(shop.inventory));

        for (let i = 0; i < possibleVisits; i++) {
          const items = Object.values(tempInventory).filter(it => it.quantity > 0);
          if (items.length === 0) break;

          const chosen = items[Math.floor(Math.random() * items.length)];
          const product = PRODUCTS[chosen.productId];
          if (!product) continue;

          // Standard pricing sales
          const attractionLevel = shop.upgrades.attraction;
          const maxMarkup = UPGRADES.attraction.getMaxPriceMarkup(attractionLevel);
          const markupBonus = 1 + (Math.random() * (maxMarkup - 1.0));
          const price = Math.round(product.baseSellPrice * markupBonus);
          const qty = Math.min(chosen.quantity, Math.floor(Math.random() * 2) + 1);

          chosen.quantity -= qty;
          if (chosen.quantity <= 0) {
            delete tempInventory[chosen.productId];
          }

          totalRevenue += price * qty;
          totalQtySold += qty;
          totalXpGained += qty * (product.minLevel * 8);
          salesCount++;
        }

        if (totalQtySold > 0) {
          // Send offline updates to database simulator
          // Let's create an offline payout function or manually apply in simulation
          setTimeout(() => {
            // Apply updates
            const updatedShop = { ...shop };
            updatedShop.inventory = tempInventory;
            updatedShop.balance = parseFloat((updatedShop.balance + totalRevenue).toFixed(2));
            updatedShop.stats.totalEarnings += totalRevenue;
            updatedShop.stats.totalSalesCount += totalQtySold;
            updatedShop.xp += totalXpGained;
            
            // Level calculations
            while (updatedShop.xp >= updatedShop.xpToNextLevel) {
              updatedShop.xp -= updatedShop.xpToNextLevel;
              updatedShop.level += 1;
              updatedShop.xpToNextLevel = getXpForLevel(updatedShop.level);
            }
            updatedShop.updatedAt = new Date().toISOString();
            
            // Save shop back
            // In a real app we'd call a batch commit or function.
            // In simulation, we update localStorage shops
            const rawShops = JSON.parse(localStorage.getItem('zazudo_shops') || '{}');
            rawShops[currentUser.uid] = updatedShop;
            localStorage.setItem('zazudo_shops', JSON.stringify(rawShops));
            
            // Add notification
            dbService.subscribeShop(currentUser.uid, (data) => setShop(data))(); // Force refresh
            showToast(`📈 Offline Payout: Your shop made $${totalRevenue} from ${totalQtySold} sales while you were away!`, 'success');
            triggerSound('upgrade');
          }, 500);
        }
      }
    }
  }, [currentUser]); // Run once upon auth load and shop resolution

  // AI Customer Ticker Loop
  useEffect(() => {
    if (!currentUser || !shop || isVisualSimulationActive) {
      if (customerTimerRef.current) clearInterval(customerTimerRef.current);
      return;
    }

    const marketingLevel = shop.upgrades.marketing;
    const interval = UPGRADES.marketing.getVisitInterval(marketingLevel) * 1000; // in milliseconds

    if (customerTimerRef.current) clearInterval(customerTimerRef.current);

    customerTimerRef.current = setInterval(() => {
      const result = dbService.tickAiCustomers(currentUser.uid);
      if (result) {
        triggerSound('sale');
        if (result.leveledUp) {
          showToast(`⚡ LEVEL UP! Your shop is now Level ${result.newLevel}!`, 'success');
          triggerSound('upgrade');
        }
      }
    }, interval);

    return () => {
      if (customerTimerRef.current) clearInterval(customerTimerRef.current);
    };
  }, [currentUser, shop?.upgrades?.marketing, shop?.level, isVisualSimulationActive]);

  // Action Wrappers
  const login = async (email, password) => {
    try {
      setError(null);
      const user = await authService.login(email, password);
      showToast(`Welcome back, ${user.displayName}!`, 'info');
      triggerSound('success');
      return user;
    } catch (e) {
      setError(e.message);
      triggerSound('error');
      throw e;
    }
  };

  const register = async (email, password, displayName) => {
    try {
      setError(null);
      const user = await authService.register(email, password, displayName);
      showToast(`Welcome to Zazudo Game! Your shop is open.`, 'success');
      triggerSound('upgrade');
      return user;
    } catch (e) {
      setError(e.message);
      triggerSound('error');
      throw e;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      showToast('Logged out successfully.', 'info');
    } catch (e) {
      setError(e.message);
    }
  };

  const buyFromWholesale = async (productId, qty) => {
    if (!currentUser) return;
    try {
      setError(null);
      await dbService.buyFromWholesale(currentUser.uid, productId, qty);
      showToast(`Successfully purchased ${qty}x ${PRODUCTS[productId].name}!`, 'success');
      triggerSound('success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
      triggerSound('error');
    }
  };

  const listOnMarketplace = async (productId, qty, pricePerUnit) => {
    if (!currentUser) return;
    try {
      setError(null);
      await dbService.listOnMarketplace(currentUser.uid, productId, qty, pricePerUnit);
      showToast(`Listed ${qty}x ${PRODUCTS[productId].name} on the marketplace.`, 'success');
      triggerSound('success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
      triggerSound('error');
    }
  };

  const cancelMarketplaceListing = async (listingId) => {
    if (!currentUser) return;
    try {
      setError(null);
      await dbService.cancelMarketplaceListing(currentUser.uid, listingId);
      showToast('Listing cancelled. Stock returned to inventory.', 'info');
      triggerSound('success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
      triggerSound('error');
    }
  };

  const purchaseMarketplaceListing = async (listingId, qtyToBuy) => {
    if (!currentUser) return;
    try {
      setError(null);
      await dbService.purchaseMarketplaceListing(currentUser.uid, listingId, qtyToBuy);
      showToast(`Bought ${qtyToBuy}x item from marketplace!`, 'success');
      triggerSound('success');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
      triggerSound('error');
    }
  };

  const upgradeShop = async (upgradeType) => {
    if (!currentUser) return;
    try {
      setError(null);
      await dbService.upgradeShop(currentUser.uid, upgradeType);
      showToast(`Upgrade purchased: ${UPGRADES[upgradeType].name}!`, 'success');
      triggerSound('upgrade');
    } catch (e) {
      setError(e.message);
      showToast(e.message, 'error');
      triggerSound('error');
    }
  };

  const processCustomerSale = () => {
    if (!currentUser) return null;
    const result = dbService.tickAiCustomers(currentUser.uid);
    if (result) {
      triggerSound('sale');
      if (result.leveledUp) {
        showToast(`⚡ LEVEL UP! Your shop is now Level ${result.newLevel}!`, 'success');
        triggerSound('upgrade');
      }
    }
    return result;
  };

  const restockItem = async (boxId, qty) => {
    if (!currentUser) return;
    try {
      await dbService.restockItem(currentUser.uid, boxId, qty);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const quickStockAll = async () => {
    if (!currentUser) return;
    try {
      await dbService.quickStockAll(currentUser.uid);
      showToast('All delivery boxes stocked into inventory!', 'success');
      triggerSound('success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  return (
    <GameContext.Provider value={{
      currentUser,
      shop,
      marketplaceListings,
      leaderboard,
      salesLogs,
      loading,
      error,
      toast,
      soundEnabled,
      toggleSound,
      showToast,
      isVisualSimulationActive,
      setIsVisualSimulationActive,
      processCustomerSale,
      restockItem,
      quickStockAll,
      login,
      register,
      logout,
      buyFromWholesale,
      listOnMarketplace,
      cancelMarketplaceListing,
      purchaseMarketplaceListing,
      upgradeShop
    }}>
      {children}
    </GameContext.Provider>
  );
};
