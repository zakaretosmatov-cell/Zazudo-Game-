// Game configuration and static catalog data

export const PRODUCTS = {
  cyber_drink: {
    id: 'cyber_drink',
    name: 'Cyber Cola',
    description: 'Neon-infused carbonated energy drink. High turnover rate.',
    baseBuyPrice: 6,
    baseSellPrice: 10,
    minLevel: 1,
    rarity: 'common',
    emoji: '🥤'
  },
  coffee_beans: {
    id: 'coffee_beans',
    name: 'Organic Beans',
    description: 'Locally sourced fair-trade coffee beans. A shop staple.',
    baseBuyPrice: 12,
    baseSellPrice: 20,
    minLevel: 1,
    rarity: 'common',
    emoji: '☕'
  },
  tech_gadget: {
    id: 'tech_gadget',
    name: 'Smart Ring',
    description: 'Biometric tracking ring. A trendy gadget for the youth.',
    baseBuyPrice: 40,
    baseSellPrice: 65,
    minLevel: 2,
    rarity: 'uncommon',
    emoji: '💍'
  },
  retro_console: {
    id: 'retro_console',
    name: 'Retro Boy Console',
    description: 'Handheld gaming console with 8-bit classic pre-installed.',
    baseBuyPrice: 90,
    baseSellPrice: 145,
    minLevel: 3,
    rarity: 'uncommon',
    emoji: '🎮'
  },
  designer_shoes: {
    id: 'designer_shoes',
    name: 'Aero Sneakers',
    description: 'Self-lacing running shoes with customizable LED designs.',
    baseBuyPrice: 180,
    baseSellPrice: 290,
    minLevel: 3,
    rarity: 'rare',
    emoji: '👟'
  },
  solar_charger: {
    id: 'solar_charger',
    name: 'Solar Backpack',
    description: 'Weatherproof backpack with integrated solar panels.',
    baseBuyPrice: 320,
    baseSellPrice: 510,
    minLevel: 4,
    rarity: 'rare',
    emoji: '🎒'
  },
  ai_chip: {
    id: 'ai_chip',
    name: 'Quantum AI Core',
    description: 'Super-efficient neural accelerator for smart home rigs.',
    baseBuyPrice: 750,
    baseSellPrice: 1300,
    minLevel: 5,
    rarity: 'legendary',
    emoji: '🧠'
  },
  luxury_watch: {
    id: 'luxury_watch',
    name: 'Chrono Gold',
    description: 'Gold-plated automatic chronograph watch. Ultimate status symbol.',
    baseBuyPrice: 1800,
    baseSellPrice: 3200,
    minLevel: 6,
    rarity: 'legendary',
    emoji: '⌚'
  }
};

// XP formulas
export const getXpForLevel = (level) => {
  return Math.round(100 * Math.pow(1.5, level - 1));
};

// Upgrade multipliers & costs
export const UPGRADES = {
  storage: {
    name: 'Warehouse expansion',
    description: 'Increase your maximum inventory capacity limit.',
    baseCost: 200,
    costMultiplier: 1.6,
    getCapacity: (level) => 50 + (level - 1) * 25,
    emoji: '📦'
  },
  marketing: {
    name: 'Neon Ad Campaign',
    description: 'Increase customer visit frequency and item sales volume.',
    baseCost: 350,
    costMultiplier: 1.7,
    getVisitInterval: (level) => Math.max(10, 30 - (level - 1) * 3), // in seconds
    emoji: '📣'
  },
  attraction: {
    name: 'Storefront Display',
    description: 'Boost chance of AI customers purchasing higher-markup items.',
    baseCost: 500,
    costMultiplier: 1.8,
    getMaxPriceMarkup: (level) => 1.2 + (level - 1) * 0.1, // percentage of base price customers tolerate
    emoji: '✨'
  }
};
