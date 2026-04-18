// ============================================================
//  ecoconfiguration/battle.js
//  Battle system settings
// ============================================================
module.exports = {

  cooldownMs:    30_000,   // 30 seconds

  // ── Team size ─────────────────────────────────────────
  maxTeamSize:   3,        // max creatures per team

  // ── PvP rewards ───────────────────────────────────────
  pvp: {
    winnerCoins:  { min: 50_000,   max: 2_000_000  },
    loserCoins:   0,             // loser gets nothing
    winnerXp:     150,
    loserXp:      30,
    wagerMin:     100,           // minimum wager for wager battles
    wagerMax:     100_000,
  },

  // ── PvE (wild battle) rewards ─────────────────────────
  pve: {
    winnerCoins:  { min: 200,   max: 1_000  },
    winnerXp:     80,
    loseXp:       20,
  },

  // ── Wild creature pool for PvE ────────────────────────
  // Will use hunt creatures list
  wildLevelRange: { min: 1, max: 10 },

  // ── Flee chance ───────────────────────────────────────
  fleeChance:    0.4,      // 40% chance to flee PvE

  // ── PvP challenge timeout ─────────────────────────────
  challengeTimeoutMs: 60_000, // 60 seconds to accept

};
