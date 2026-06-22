// LocalStorage Database Simulator for Firestore & Auth
import { PRODUCTS, UPGRADES, getXpForLevel } from './gameData';

const STORAGE_KEYS = {
  USERS: 'zazudo_users',
  SHOPS: 'zazudo_shops',
  MARKET: 'zazudo_market',
  TX: 'zazudo_transactions',
  AUTH: 'zazudo_current_user',
  LOGS: 'zazudo_sales_logs'
};

// Listeners map for simulating real-time subscriptions (onSnapshot)
const listeners = {};

const triggerChange = (collectionKey) => {
  if (listeners[collectionKey]) {
    const data = getRawData(collectionKey);
    listeners[collectionKey].forEach(callback => callback(data));
  }
};

const getRawData = (key) => {
  const data = localStorage.getItem(key);
  if (!data) {
    if (key === STORAGE_KEYS.USERS) return {};
    if (key === STORAGE_KEYS.SHOPS) return {};
    if (key === STORAGE_KEYS.MARKET) return {};
    if (key === STORAGE_KEYS.TX) return [];
    if (key === STORAGE_KEYS.LOGS) return [];
    return null;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

const saveRawData = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  triggerChange(key);
};

// Initialize default market listings if empty
const initDefaultMarket = () => {
  const market = getRawData(STORAGE_KEYS.MARKET);
  if (Object.keys(market).length === 0) {
    const defaultListings = {
      list_001: {
        id: 'list_001',
        sellerId: 'npc_jerry',
        sellerShopName: "Jerry's Wholesale Surplus",
        productId: 'coffee_beans',
        productName: 'Organic Beans',
        pricePerUnit: 14,
        quantity: 15,
        status: 'active',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      list_002: {
        id: 'list_002',
        sellerId: 'npc_sarah',
        sellerShopName: 'Sarah Tech Outlet',
        productId: 'tech_gadget',
        productName: 'Smart Ring',
        pricePerUnit: 48,
        quantity: 8,
        status: 'active',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      },
      list_003: {
        id: 'list_003',
        sellerId: 'npc_bob',
        sellerShopName: 'Cyber Emporium',
        productId: 'cyber_drink',
        productName: 'Cyber Cola',
        pricePerUnit: 7,
        quantity: 25,
        status: 'active',
        createdAt: new Date(Date.now() - 100000).toISOString()
      }
    };
    saveRawData(STORAGE_KEYS.MARKET, defaultListings);
  }
};

initDefaultMarket();

export const dbSim = {
  // --- AUTH ---
  getCurrentUser: () => {
    const userStr = localStorage.getItem(STORAGE_KEYS.AUTH);
    return userStr ? JSON.parse(userStr) : null;
  },

  register: (email, password, displayName) => {
    const users = getRawData(STORAGE_KEYS.USERS);
    const emailLower = email.toLowerCase();
    
    // Check if user already exists
    const existing = Object.values(users).find(u => u.email.toLowerCase() === emailLower);
    if (existing) {
      throw new Error('Email already registered.');
    }

    const uid = 'usr_' + Math.random().toString(36).substr(2, 9);
    const userDoc = {
      uid,
      email,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString()
    };

    users[uid] = userDoc;
    saveRawData(STORAGE_KEYS.USERS, users);

    // Create Initial Shop
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    let balance = 1000;
    let level = 1;
    let upgrades = { storage: 1, marketing: 1, attraction: 1 };
    let inventory = {
      cyber_drink: { productId: 'cyber_drink', quantity: 10 },
      coffee_beans: { productId: 'coffee_beans', quantity: 5 }
    };
    
    if (emailLower === 'tycoon@zazudo.io') {
      balance = 25000;
      level = 5;
      upgrades = { storage: 4, marketing: 3, attraction: 3 };
      inventory = {
        cyber_drink: { productId: 'cyber_drink', quantity: 30 },
        coffee_beans: { productId: 'coffee_beans', quantity: 20 },
        tech_gadget: { productId: 'tech_gadget', quantity: 12 },
        ai_chip: { productId: 'ai_chip', quantity: 4 }
      };
    }

    shops[uid] = {
      ownerId: uid,
      name: emailLower === 'tycoon@zazudo.io' ? "Tycoon Empire HQ" : `${userDoc.displayName}'s HQ`,
      balance,
      level,
      xp: 0,
      xpToNextLevel: getXpForLevel(level),
      inventory,
      upgrades,
      stats: {
        totalEarnings: emailLower === 'tycoon@zazudo.io' ? 100000 : 0,
        totalSalesCount: emailLower === 'tycoon@zazudo.io' ? 450 : 0,
        createdAt: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };
    saveRawData(STORAGE_KEYS.SHOPS, shops);

    // Auto-login
    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userDoc));
    triggerChange(STORAGE_KEYS.AUTH);
    return userDoc;
  },

  login: (email, password) => {
    const users = getRawData(STORAGE_KEYS.USERS);
    const emailLower = email.toLowerCase();
    const userDoc = Object.values(users).find(u => u.email.toLowerCase() === emailLower);

    if (!userDoc) {
      // For testing convenience, auto-register if they login with any credentials first time
      return dbSim.register(email, password, email.split('@')[0]);
    }

    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(userDoc));
    triggerChange(STORAGE_KEYS.AUTH);
    return userDoc;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    triggerChange(STORAGE_KEYS.AUTH);
  },

  subscribeAuth: (callback) => {
    const key = STORAGE_KEYS.AUTH;
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    callback(dbSim.getCurrentUser());
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== callback);
    };
  },

  // --- SHOPS ---
  getShop: (ownerId) => {
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    return shops[ownerId] || null;
  },

  subscribeShop: (ownerId, callback) => {
    const key = STORAGE_KEYS.SHOPS;
    if (!listeners[key]) listeners[key] = [];
    
    const wrapper = (allShops) => {
      callback(allShops[ownerId] || null);
    };
    
    listeners[key].push(wrapper);
    callback(dbSim.getShop(ownerId));
    
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== wrapper);
    };
  },

  // --- WHOLESALE TRADING ---
  buyFromWholesale: (uid, productId, qty) => {
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const shop = shops[uid];
    if (!shop) throw new Error('Shop not found.');

    const product = PRODUCTS[productId];
    if (!product) throw new Error('Product not found in registry.');

    if (shop.level < product.minLevel) {
      throw new Error(`Requires Shop Level ${product.minLevel} to purchase.`);
    }

    const totalCost = product.baseBuyPrice * qty;
    if (shop.balance < totalCost) {
      throw new Error('Insufficient shop balance.');
    }

    // Check inventory storage limits
    const currentStorageLevel = shop.upgrades.storage;
    const capacity = UPGRADES.storage.getCapacity(currentStorageLevel);
    const currentTotalQty = Object.values(shop.inventory).reduce((acc, item) => acc + item.quantity, 0);

    if (currentTotalQty + qty > capacity) {
      throw new Error(`Inventory capacity full. Max capacity is ${capacity}. Expand your warehouse!`);
    }

    // Process Transaction
    shop.balance = parseFloat((shop.balance - totalCost).toFixed(2));
    
    if (!shop.inventory[productId]) {
      shop.inventory[productId] = { productId, quantity: 0 };
    }
    shop.inventory[productId].quantity += qty;
    shop.updatedAt = new Date().toISOString();

    shops[uid] = shop;
    saveRawData(STORAGE_KEYS.SHOPS, shops);

    // Record Transaction Log
    const transactions = getRawData(STORAGE_KEYS.TX);
    const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
    transactions.unshift({
      id: txId,
      type: 'buy_system',
      buyerId: uid,
      sellerId: null,
      productId,
      quantity: qty,
      totalPrice: totalCost,
      timestamp: new Date().toISOString()
    });
    saveRawData(STORAGE_KEYS.TX, transactions.slice(0, 100)); // cap logs
    
    return shop;
  },

  // --- MARKETPLACE SYSTEM ---
  subscribeMarketplace: (callback) => {
    const key = STORAGE_KEYS.MARKET;
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    callback(getRawData(STORAGE_KEYS.MARKET));
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== callback);
    };
  },

  listOnMarketplace: (uid, productId, qty, pricePerUnit) => {
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const shop = shops[uid];
    if (!shop) throw new Error('Shop not found.');

    if (qty <= 0 || pricePerUnit <= 0) {
      throw new Error('Quantity and price must be positive.');
    }

    const inventoryItem = shop.inventory[productId];
    if (!inventoryItem || inventoryItem.quantity < qty) {
      throw new Error('Insufficient inventory to list.');
    }

    // Deduct stock from shop inventory
    inventoryItem.quantity -= qty;
    if (inventoryItem.quantity === 0) {
      delete shop.inventory[productId];
    }
    shop.updatedAt = new Date().toISOString();
    shops[uid] = shop;

    // Create listing
    const market = getRawData(STORAGE_KEYS.MARKET);
    const listingId = 'list_' + Math.random().toString(36).substr(2, 9);
    market[listingId] = {
      id: listingId,
      sellerId: uid,
      sellerShopName: shop.name,
      productId,
      productName: PRODUCTS[productId].name,
      pricePerUnit: parseFloat(pricePerUnit),
      quantity: parseInt(qty),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    saveRawData(STORAGE_KEYS.SHOPS, shops);
    saveRawData(STORAGE_KEYS.MARKET, market);

    return shop;
  },

  cancelMarketplaceListing: (uid, listingId) => {
    const market = getRawData(STORAGE_KEYS.MARKET);
    const listing = market[listingId];
    if (!listing || listing.status !== 'active') {
      throw new Error('Listing is no longer active.');
    }
    if (listing.sellerId !== uid) {
      throw new Error('Unauthorized to cancel this listing.');
    }

    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const shop = shops[uid];
    if (!shop) throw new Error('Shop not found.');

    // Return stock to inventory
    const productId = listing.productId;
    if (!shop.inventory[productId]) {
      shop.inventory[productId] = { productId, quantity: 0 };
    }
    shop.inventory[productId].quantity += listing.quantity;
    shop.updatedAt = new Date().toISOString();
    shops[uid] = shop;

    // Mark listing as cancelled
    listing.status = 'cancelled';
    delete market[listingId]; // remove from active board

    saveRawData(STORAGE_KEYS.SHOPS, shops);
    saveRawData(STORAGE_KEYS.MARKET, market);

    return shop;
  },

  purchaseMarketplaceListing: (buyerId, listingId, qtyToBuy) => {
    const market = getRawData(STORAGE_KEYS.MARKET);
    const listing = market[listingId];
    if (!listing || listing.status !== 'active') {
      throw new Error('Listing is no longer available.');
    }
    if (listing.sellerId === buyerId) {
      throw new Error('Cannot buy your own listing.');
    }
    if (qtyToBuy <= 0 || qtyToBuy > listing.quantity) {
      throw new Error('Invalid purchase quantity.');
    }

    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const buyerShop = shops[buyerId];
    if (!buyerShop) throw new Error('Buyer shop not found.');

    const totalPrice = parseFloat((listing.pricePerUnit * qtyToBuy).toFixed(2));
    if (buyerShop.balance < totalPrice) {
      throw new Error('Insufficient balance.');
    }

    // Check storage limits for buyer
    const capacity = UPGRADES.storage.getCapacity(buyerShop.upgrades.storage);
    const currentTotalQty = Object.values(buyerShop.inventory).reduce((acc, item) => acc + item.quantity, 0);
    if (currentTotalQty + qtyToBuy > capacity) {
      throw new Error(`Insufficient warehouse capacity. Max capacity is ${capacity}.`);
    }

    // Deduct money from buyer, add items
    buyerShop.balance = parseFloat((buyerShop.balance - totalPrice).toFixed(2));
    if (!buyerShop.inventory[listing.productId]) {
      buyerShop.inventory[listing.productId] = { productId: listing.productId, quantity: 0 };
    }
    buyerShop.inventory[listing.productId].quantity += qtyToBuy;
    buyerShop.updatedAt = new Date().toISOString();

    // Add money to seller if seller is a real player (not NPC)
    const sellerId = listing.sellerId;
    if (sellerId && !sellerId.startsWith('npc_')) {
      const sellerShop = shops[sellerId];
      if (sellerShop) {
        sellerShop.balance = parseFloat((sellerShop.balance + totalPrice).toFixed(2));
        sellerShop.stats.totalEarnings += totalPrice;
        sellerShop.updatedAt = new Date().toISOString();
      }
    }

    // Update listing
    listing.quantity -= qtyToBuy;
    if (listing.quantity === 0) {
      listing.status = 'sold';
      delete market[listingId]; // remove from active board
    }

    // Save shops & listings
    shops[buyerId] = buyerShop;
    saveRawData(STORAGE_KEYS.SHOPS, shops);
    saveRawData(STORAGE_KEYS.MARKET, market);

    // Record Transaction Log
    const transactions = getRawData(STORAGE_KEYS.TX);
    const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
    transactions.unshift({
      id: txId,
      type: 'buy_marketplace',
      buyerId,
      sellerId: listing.sellerId,
      productId: listing.productId,
      quantity: qtyToBuy,
      totalPrice,
      timestamp: new Date().toISOString()
    });
    saveRawData(STORAGE_KEYS.TX, transactions.slice(0, 100));

    return buyerShop;
  },

  // --- UPGRADE SYSTEM ---
  upgradeShop: (uid, upgradeType) => {
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const shop = shops[uid];
    if (!shop) throw new Error('Shop not found.');

    const upgradeConfig = UPGRADES[upgradeType];
    if (!upgradeConfig) throw new Error('Invalid upgrade type.');

    const currentLvl = shop.upgrades[upgradeType] || 1;
    const cost = Math.round(upgradeConfig.baseCost * Math.pow(upgradeConfig.costMultiplier, currentLvl - 1));

    if (shop.balance < cost) {
      throw new Error(`Insufficient balance. Requires $${cost} to upgrade.`);
    }

    // Deduct cost and level up
    shop.balance = parseFloat((shop.balance - cost).toFixed(2));
    shop.upgrades[upgradeType] = currentLvl + 1;
    shop.updatedAt = new Date().toISOString();

    shops[uid] = shop;
    saveRawData(STORAGE_KEYS.SHOPS, shops);

    // Record Transaction Log
    const transactions = getRawData(STORAGE_KEYS.TX);
    const txId = 'tx_' + Math.random().toString(36).substr(2, 9);
    transactions.unshift({
      id: txId,
      type: 'shop_upgrade',
      buyerId: uid,
      sellerId: null,
      productId: null,
      quantity: currentLvl + 1,
      totalPrice: cost,
      timestamp: new Date().toISOString()
    });
    saveRawData(STORAGE_KEYS.TX, transactions.slice(0, 100));

    return shop;
  },

  // --- LEADERBOARDS ---
  getLeaderboard: () => {
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const list = Object.values(shops).map(s => {
      const users = getRawData(STORAGE_KEYS.USERS);
      const ownerName = users[s.ownerId]?.displayName || 'Merchant';
      return {
        shopId: s.ownerId,
        shopName: s.name,
        ownerName,
        balance: s.balance,
        level: s.level
      };
    });

    // Add some competitive mock NPCs
    const npcs = [
      { shopId: 'npc_jerry', shopName: "Jerry's Surplus", ownerName: 'Jerry', balance: 7500, level: 5 },
      { shopId: 'npc_sarah', shopName: 'Sarah Tech Outlet', ownerName: 'Sarah', balance: 14200, level: 7 },
      { shopId: 'npc_bob', shopName: 'Cyber Emporium', ownerName: 'Bob', balance: 3500, level: 3 }
    ];

    const combined = [...list, ...npcs];
    // Sort by Level DESC, then Balance DESC
    combined.sort((a, b) => b.level - a.level || b.balance - a.balance);

    return combined.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
  },

  subscribeLeaderboard: (callback) => {
    const key = STORAGE_KEYS.SHOPS; // Triggered when any shop updates
    if (!listeners[key]) listeners[key] = [];
    
    const wrapper = () => {
      callback(dbSim.getLeaderboard());
    };
    
    listeners[key].push(wrapper);
    callback(dbSim.getLeaderboard());
    
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== wrapper);
    };
  },

  // --- SALES LOGGER FOR ACTIVE TICK DISPLAY ---
  getSalesLogs: () => {
    return getRawData(STORAGE_KEYS.LOGS);
  },

  subscribeSalesLogs: (callback) => {
    const key = STORAGE_KEYS.LOGS;
    if (!listeners[key]) listeners[key] = [];
    listeners[key].push(callback);
    callback(getRawData(STORAGE_KEYS.LOGS));
    return () => {
      listeners[key] = listeners[key].filter(cb => cb !== callback);
    };
  },

  addSalesLog: (log) => {
    const logs = getRawData(STORAGE_KEYS.LOGS);
    logs.unshift(log);
    saveRawData(STORAGE_KEYS.LOGS, logs.slice(0, 15)); // Keep last 15 ticks
  },

  // --- AI CUSTOMER TICK ENGINE (Called locally from GameContext) ---
  tickAiCustomers: (uid) => {
    const shops = getRawData(STORAGE_KEYS.SHOPS);
    const shop = shops[uid];
    if (!shop) return null;

    // Check if there are any products to sell
    const inventoryItems = Object.values(shop.inventory).filter(item => item.quantity > 0);
    if (inventoryItems.length === 0) return null;

    // Select random item from player inventory
    const randItemIdx = Math.floor(Math.random() * inventoryItems.length);
    const chosenItem = inventoryItems[randItemIdx];
    const product = PRODUCTS[chosenItem.productId];
    if (!product) return null;

    // Customer buying algorithm
    // In this game, players sell at standard pricing, but customer upgrades dictate base speeds
    // Marketing upgrade increases volume/XP. Store display (Attraction) boosts profit margins or tips.
    const attractionLevel = shop.upgrades.attraction;
    const maxMarkup = UPGRADES.attraction.getMaxPriceMarkup(attractionLevel);
    
    // AI Customer decides a purchase price
    // Base retail sell price + dynamic markup bonus based on Attraction Level
    const markupBonus = 1 + (Math.random() * (maxMarkup - 1.0));
    const salePricePerUnit = Math.round(product.baseSellPrice * markupBonus);
    
    // Calculate qty bought
    const qtyToBuy = Math.min(
      chosenItem.quantity,
      Math.floor(Math.random() * 3) + 1 // 1-3 items
    );

    const totalRevenue = salePricePerUnit * qtyToBuy;
    const netProfit = totalRevenue - (product.baseBuyPrice * qtyToBuy);

    // Apply sale updates to shop
    chosenItem.quantity -= qtyToBuy;
    if (chosenItem.quantity <= 0) {
      delete shop.inventory[chosenItem.productId];
    }
    
    shop.balance = parseFloat((shop.balance + totalRevenue).toFixed(2));
    shop.stats.totalEarnings += totalRevenue;
    shop.stats.totalSalesCount += qtyToBuy;
    
    // XP progression
    const xpGained = qtyToBuy * (product.minLevel * 8);
    shop.xp += xpGained;
    
    // Handle Level Up
    let leveledUp = false;
    while (shop.xp >= shop.xpToNextLevel) {
      shop.xp -= shop.xpToNextLevel;
      shop.level += 1;
      shop.xpToNextLevel = getXpForLevel(shop.level);
      leveledUp = true;
    }

    shop.updatedAt = new Date().toISOString();
    shops[uid] = shop;
    saveRawData(STORAGE_KEYS.SHOPS, shops);

    // Create log for dashboard display
    const saleLog = {
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      productName: product.name,
      emoji: product.emoji,
      quantity: qtyToBuy,
      revenue: totalRevenue,
      xpGained,
      leveledUp,
      newLevel: shop.level,
      timestamp: new Date().toLocaleTimeString()
    };
    dbSim.addSalesLog(saleLog);

    return saleLog;
  }
};
