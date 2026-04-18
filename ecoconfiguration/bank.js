// ============================================================
//  ecoconfiguration/bank.js
//  Bank system settings
// ============================================================
module.exports = {

  // ── Default bank storage limit ────────────────────────
  defaultLimit: 10_000_000,

  // ── Max bank limit (after all expansions) ─────────────
  maxLimit: 100_000_000_000_000_000,

  // ── Banknote (bought from shop to expand bank) ────────
  banknotePriceCoins:    2_000_000,   // cost per banknote
  banknoteExpansion:      20_000_000,   // how much each banknote expands limit

  // ── Interest ──────────────────────────────────────────
  interestRate:          0.001,    // 0.1% per 24 hours (set 0 to disable)
  interestMaxBalance:    900_000_000,  // only applies to balances below this

  // ── Deposit / Withdraw cooldown ───────────────────────
  depositCooldownMs:     0,        // 0 = no cooldown
  withdrawCooldownMs:    0,

};
