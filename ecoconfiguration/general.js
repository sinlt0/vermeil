// ============================================================
//  ecoconfiguration/general.js
//  General economy settings — amounts, names, cooldowns
// ============================================================
module.exports = {

  // ── Currency names + symbols ──────────────────────────
  currencies: {
    coins:  { name: "Coins",  symbol: "🪙", plural: "Coins"  },
    gems:   { name: "Gem",    symbol: "💎", plural: "Gems"   },
    tokens: { name: "Token",  symbol: "🔮", plural: "Tokens" },
  },

  // ── Starter pack (given on !start) ───────────────────
  starter: {
    coins:   500_000,
    gems:    5000,
    tokens:  10,
    message: "Welcome to the economy! You've been given **500,000 coins** to get started. Use `!help economy` to see all commands.",
  },

  // ── Daily reward ──────────────────────────────────────
  daily: {
    base:       100_000,      // base coins
    streakBonus: 100_000,       // extra per streak day
    maxStreak:  30,         // max streak days
    gemChance:  0.05,       // 5% chance to also get a gem
    gemAmount:  1,
    cooldownMs: 86_400_000, // 24 hours
  },

  // ── Weekly reward ─────────────────────────────────────
  weekly: {
    base:       500_000,
    gems:       1000,
    cooldownMs: 604_800_000, // 7 days
  },

  // ── Beg ───────────────────────────────────────────────
  beg: {
    minCoins:   20_000,
    maxCoins:   100_000,
    cooldownMs: 600_000,     // 1 minute
    failChance: 0.2,        // 20% chance to fail (get nothing)
  },

  // ── Pay limits ────────────────────────────────────────
  pay: {
    minAmount:  1,
    maxAmount:  1_000_000_000,
    taxRate:    0.05,       // 5% tax on transfers
  },

  // ── Level up reward ───────────────────────────────────
  levelUp: {
    coinsPerLevel: 500_000,     // coins * level given on level up
  },

  // ── XP per activity ──────────────────────────────────
  xpRewards: {
    work:     50,
    hunt:     30,
    battle:   80,
    crime:    20,
    gambling: 10,
    daily:    100,
  },

  // ── Announcement channel (for rare drops, lb rewards) ─
  announcementChannelId: null, // set your channel ID here

  // ── Rare drop announcement threshold ─────────────────
  rareDropAnnounce: true,       // announce epic+ creature catches
};
