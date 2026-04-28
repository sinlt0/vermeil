// ============================================================
//  utils/collection/badgeUtils.js
//  Badge system — 7 types, 4 levels each
//  Costs, perks, checks
// ============================================================

const BADGES = {
  bronze: {
    emoji:   "🥉",
    name:    "Bronze Badge",
    color:   0xcd7f32,
    costs:   [200, 400, 800, 1600],  // cost per level upgrade
    perks: [
      "Wishlist: +5 slots (total 10)",
      "Wishlist: +15 slots (total 20)",
      "Wishlist: +30 slots (total 35)",
      "Wishlist: +65 slots (total 100) | **+500 kakera when you claim a wishlist character**",
    ],
    getWishlistSlots: (level) => [5, 10, 20, 35, 100][level],
  },
  silver: {
    emoji:   "🥈",
    name:    "Silver Badge",
    color:   0xC0C0C0,
    costs:   [400, 800, 1600, 3200],
    perks: [
      "Wishlist chars spawn 2x more often",
      "Wishlist chars spawn 3x more often",
      "Wishlist chars spawn 4x more often",
      "Wishlist chars spawn 5x more often | **+200 kakera when someone claims your wishlist char**",
    ],
    getSpawnMultiplier: (level) => [1, 2, 3, 4, 5][level],
  },
  gold: {
    emoji:   "🥇",
    name:    "Gold Badge",
    color:   0xFFD700,
    costs:   [600, 1200, 2400, 4800],
    perks: [
      "Kakera react costs 90% power instead of 100%",
      "Kakera react costs 80% power",
      "Kakera react costs 70% power",
      "Kakera react costs 60% power | **$dailykakera restores full react power**",
    ],
    getPowerCost: (level) => [100, 90, 80, 70, 60][level],
  },
  sapphire: {
    emoji:   "💎",
    name:    "Sapphire Badge",
    color:   0x0F52BA,
    costs:   [800, 1600, 3200, 6400],
    perks: [
      "+2 extra rolls per reset",
      "+4 extra rolls per reset",
      "+6 extra rolls per reset",
      "+8 extra rolls per reset | **Blue kakera → Yellow kakera for your rolls**",
    ],
    getExtraRolls: (level) => [0, 2, 4, 6, 8][level],
  },
  ruby: {
    emoji:   "❤️‍🔥",
    name:    "Ruby Badge",
    color:   0x9B111E,
    costs:   [1000, 2000, 4000, 8000],
    perks: [
      "All Bronze + Silver perks combined",
      "All Bronze + Silver + Gold perks",
      "All Bronze + Silver + Gold + Sapphire perks",
      "All previous perks maxed",
    ],
  },
  emerald: {
    emoji:   "💚",
    name:    "Emerald Badge",
    color:   0x50C878,
    costs:   [1500, 3000, 6000, 12000],
    perks: [
      "Unlock $resetclaim — reset your claim timer (6h cooldown)",
      "$resetclaim cooldown reduced to 4h",
      "$resetclaim cooldown reduced to 2h",
      "$resetclaim cooldown reduced to 30min | **Each claim also gives you the char's kakera value**",
    ],
    getResetCooldown: (level) => [null, 6, 4, 2, 0.5][level],
  },
  diamond: {
    emoji:   "💠",
    name:    "Diamond Badge",
    color:   0xB9F2FF,
    costs:   [2000, 4000, 8000, 16000],
    perks: [
      "Unlock Soulmate system ($sl)",
      "Soulmates can be copied to new servers",
      "Enhanced trade: give multiple chars",
      "All perks maxed | **Multi-trade unlocked**",
    ],
  },
};

const BADGE_ORDER = ["bronze","silver","gold","sapphire","ruby","emerald","diamond"];

// Total kakera needed to reach a level
function totalCostToLevel(badgeType, targetLevel) {
  const badge = BADGES[badgeType];
  if (!badge) return 0;
  return badge.costs.slice(0, targetLevel).reduce((a, b) => a + b, 0);
}

// Cost for next level upgrade
function nextLevelCost(badgeType, currentLevel) {
  const badge = BADGES[badgeType];
  if (!badge || currentLevel >= 4) return null;
  return badge.costs[currentLevel];
}

// Check if a user has a specific badge perk
function hasPerk(stats, badgeType, minLevel) {
  return (stats?.badges?.[badgeType]?.level ?? 0) >= minLevel;
}

// Get all active perks for a user
function getActivePerks(stats) {
  const perks = {
    wishlistSlots:      10,   // default 5, bronze adds more
    wishlistSpawnMult:  1,
    kakeraReactCost:    100,
    extraRolls:         0,
    hasResetClaim:      false,
    resetClaimCooldown: null,
    hasMultiTrade:      false,
    hasSoulmates:       false,
    claimGivesKakera:   false,  // emerald IV
    wishlistClaimBonus: false,  // bronze IV
    wishlistOtherBonus: false,  // silver IV
    dailyRestoresPower: false,  // gold IV
    blueToYellow:       false,  // sapphire IV
  };

  if (!stats?.badges) return perks;

  const b = stats.badges;

  // Bronze
  const bronzeLevel = b.bronze?.level ?? 0;
  const bronzeSlots = BADGES.bronze.getWishlistSlots(bronzeLevel);
  perks.wishlistSlots     = bronzeSlots;
  perks.wishlistClaimBonus = bronzeLevel >= 4;

  // Silver
  const silverLevel = b.silver?.level ?? 0;
  perks.wishlistSpawnMult  = BADGES.silver.getSpawnMultiplier(silverLevel);
  perks.wishlistOtherBonus = silverLevel >= 4;

  // Gold
  const goldLevel = b.gold?.level ?? 0;
  perks.kakeraReactCost  = BADGES.gold.getPowerCost(goldLevel);
  perks.dailyRestoresPower = goldLevel >= 4;

  // Sapphire
  const sapphireLevel = b.sapphire?.level ?? 0;
  perks.extraRolls   = BADGES.sapphire.getExtraRolls(sapphireLevel);
  perks.blueToYellow = sapphireLevel >= 4;

  // Emerald
  const emeraldLevel = b.emerald?.level ?? 0;
  perks.hasResetClaim       = emeraldLevel >= 1;
  perks.resetClaimCooldown  = BADGES.emerald.getResetCooldown(emeraldLevel);
  perks.claimGivesKakera    = emeraldLevel >= 4;

  // Diamond
  const diamondLevel = b.diamond?.level ?? 0;
  perks.hasSoulmates  = diamondLevel >= 1;
  perks.hasMultiTrade = diamondLevel >= 4;

  // Ruby inherits perks (simplified)
  if ((b.ruby?.level ?? 0) >= 1) {
    perks.wishlistSlots     = Math.max(perks.wishlistSlots, 35);
    perks.wishlistSpawnMult = Math.max(perks.wishlistSpawnMult, 3);
  }

  return perks;
}

module.exports = { BADGES, BADGE_ORDER, totalCostToLevel, nextLevelCost, hasPerk, getActivePerks };
