// ============================================================
//  ecoconfiguration/gambling.js
//  Gambling settings — slots, coinflip, blackjack, dice
// ============================================================
module.exports = {

  // ── Slots ─────────────────────────────────────────────
  slots: {
    cooldownMs:  600_000,          // 5 seconds
    minBet:      20_000,
    maxBet:      2_000_000_000,
    // Multipliers defined in ecoGamblingUtils.js
  },

  // ── Coinflip ──────────────────────────────────────────
  coinflip: {
    cooldownMs:  600_000,          // 3 seconds
    minBet:      50_000,
    maxBet:      10_000_000_000,
    multiplier:  2,              // win 2x your bet
  },

  // ── Blackjack ─────────────────────────────────────────
  blackjack: {
    cooldownMs:  1_000_000,
    minBet:      100_000,
    maxBet:      5_000_000,
    multiplier:  2,              // win 2x bet on normal win
    blackjackMultiplier: 2.5,    // 2.5x on blackjack (21 on first 2 cards)
    dealerStandsAt: 17,
    timeoutMs:   60_000,         // 60s to make a move
  },

  // ── Dice ──────────────────────────────────────────────
  dice: {
    cooldownMs:   3_000_000,
    minBet:       500_000,
    maxBet:       500_000_000,
    sides:        6,
    winMultiplier: 6,             // win 6x bet if you guess exact number
    highLowMultiplier: 2,         // win 2x if you guess high (4-6) or low (1-3)
  },

};
