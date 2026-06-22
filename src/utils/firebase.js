// Firebase SDK abstraction and client initialization bridge
import { dbSim } from './dbSim';

// To connect to a live Firebase instance, fill out your env files or update this configuration.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

// Check if Firebase configs are provided
const hasFirebaseConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

// For MVP speed and offline demonstration, we default to dbSim.
// Toggle this boolean if you want to enforce Firebase Firestore connection.
const useRealFirebase = hasFirebaseConfig;

if (!useRealFirebase) {
  console.log("🎮 Zazudo Game is running in Local Simulation Mode. Changes are saved in LocalStorage.");
} else {
  console.log("🔥 Zazudo Game is connected to Firebase Backend Services.");
}

// -------------------------------------------------------------
// Auth Service abstraction Layer
// -------------------------------------------------------------
export const authService = {
  getCurrentUser: () => {
    if (useRealFirebase) {
      // Stub for real Firebase auth currentUser
      return null; 
    }
    return dbSim.getCurrentUser();
  },
  
  login: async (email, password) => {
    if (useRealFirebase) {
      // In a real app, import { signInWithEmailAndPassword } from 'firebase/auth'
      throw new Error("Firebase Live Auth not implemented in scaffold");
    }
    return dbSim.login(email, password);
  },

  register: async (email, password, displayName) => {
    if (useRealFirebase) {
      // In a real app, import { createUserWithEmailAndPassword } from 'firebase/auth'
      throw new Error("Firebase Live Auth not implemented in scaffold");
    }
    return dbSim.register(email, password, displayName);
  },

  logout: async () => {
    if (useRealFirebase) {
      // In a real app, import { signOut } from 'firebase/auth'
      return;
    }
    return dbSim.logout();
  },

  subscribeAuth: (callback) => {
    if (useRealFirebase) {
      // In a real app: return onAuthStateChanged(auth, callback)
      return () => {};
    }
    return dbSim.subscribeAuth(callback);
  }
};

// -------------------------------------------------------------
// Database Service abstraction Layer (Firestore & Functions wrapper)
// -------------------------------------------------------------
export const dbService = {
  subscribeShop: (ownerId, callback) => {
    if (useRealFirebase) {
      // In a real app: return onSnapshot(doc(db, "shops", ownerId), doc => callback(doc.data()))
      return () => {};
    }
    return dbSim.subscribeShop(ownerId, callback);
  },

  buyFromWholesale: async (uid, productId, qty) => {
    if (useRealFirebase) {
      // Trigger secure Cloud Function: buyFromWholesale({ productId, qty })
      return;
    }
    return dbSim.buyFromWholesale(uid, productId, qty);
  },

  subscribeMarketplace: (callback) => {
    if (useRealFirebase) {
      // In a real app: query marketplace_listings collection where status == 'active'
      return () => {};
    }
    return dbSim.subscribeMarketplace(callback);
  },

  listOnMarketplace: async (uid, productId, qty, pricePerUnit) => {
    if (useRealFirebase) {
      // Trigger Cloud Function or Firestore atomic batch
      return;
    }
    return dbSim.listOnMarketplace(uid, productId, qty, pricePerUnit);
  },

  cancelMarketplaceListing: async (uid, listingId) => {
    if (useRealFirebase) {
      // Trigger Cloud Function/transaction
      return;
    }
    return dbSim.cancelMarketplaceListing(uid, listingId);
  },

  purchaseMarketplaceListing: async (uid, listingId, qtyToBuy) => {
    if (useRealFirebase) {
      // Trigger Cloud Function: purchaseMarketplaceListing({ listingId, qtyToBuy })
      return;
    }
    return dbSim.purchaseMarketplaceListing(uid, listingId, qtyToBuy);
  },

  upgradeShop: async (uid, upgradeType) => {
    if (useRealFirebase) {
      // Trigger Cloud Function: upgradeShop({ upgradeType })
      return;
    }
    return dbSim.upgradeShop(uid, upgradeType);
  },

  subscribeLeaderboard: (callback) => {
    if (useRealFirebase) {
      // In a real app: return onSnapshot(doc(db, "leaderboard", "global"), doc => callback(doc.data().rankings))
      return () => {};
    }
    return dbSim.subscribeLeaderboard(callback);
  },

  subscribeSalesLogs: (callback) => {
    if (useRealFirebase) {
      return () => {};
    }
    return dbSim.subscribeSalesLogs(callback);
  },

  tickAiCustomers: (uid) => {
    if (useRealFirebase) {
      // In a real app, this is computed offline by the Cloud Cron scheduler.
      return null;
    }
    return dbSim.tickAiCustomers(uid);
  }
};
