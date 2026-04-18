// ============================================================
//  ecoconfiguration/crime.js
//  Crime + Rob settings
// ============================================================
module.exports = {

  // ── Rob ───────────────────────────────────────────────
  rob: {
    cooldownMs:      600_000,   // 5 minutes
    minWalletToRob:  100_000,       // target must have this in wallet
    successRate:     0.45,      // 45% success chance
    robPercent:      { min: 0.1, max: 0.4 }, // steal 10-40% of wallet
    fineOnFail:      { min: 200, max: 200_000 }, // fine paid to target on failure
    // Fine must come from robber's wallet
  },

  // ── Crime ─────────────────────────────────────────────
  crime: {
    cooldownMs:  600_000,       // 5 minutes
    successRate: 0.6,           // 60% success
    rewards: [
      { action: "You pickpocketed a tourist",        min: 20_000,   max: 80_000    },
      { action: "You hacked an ATM",                  min: 50_000,   max: 200_000  },
      { action: "You forged some documents",          min: 30_00,   max: 20_200  },
      { action: "You ran a street scam",              min: 20_000,   max: 60_000    },
      { action: "You robbed a convenience store",     min: 80_000,   max: 30_000  },
      { action: "You smuggled contraband",            min: 100_000, max: 400_000  },
      { action: "You hacked a corporate database",    min: 10_500, max: 60_000  },
    ],
    fineOnFail: { min: 10_000, max: 2_000_000 },
    failMessages: [
      "You got caught by the police! Fined {fine} coins.",
      "The security guard spotted you! Fined {fine} coins.",
      "Your plan failed miserably. Fined {fine} coins.",
    ],
  },

  // ── Heist ─────────────────────────────────────────────
  heist: {
    cooldownMs:       600_000,  // 10 minutes
    minPlayers:       2,
    maxPlayers:       5,
    joinWindowMs:     30_000,   // 30 seconds to join
    successRateBase:  0.3,      // 30% base success
    successPerPlayer: 0.1,      // +10% per extra player
    rewardPerPlayer:  { min: 2_000_000, max: 20_000_000 },
    fineOnFail:       { min: 500_000,   max: 3_000_000 },
  },

  // ── Beg ───────────────────────────────────────────────
  // (also in general.js — crime cooldown separate)
  begCooldownMs: 60_000,

};
