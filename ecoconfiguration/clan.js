// ============================================================
//  ecoconfiguration/clan.js
//  Clan system settings
// ============================================================
module.exports = {

  createCost:        5_000_000,    // coins to create a clan
  renameCost:        2_000_000,    // coins to rename
  maxMembers:        50,        // max clan size
  maxOfficers:       5,         // max officers
  tagMinLength:      2,
  tagMaxLength:      5,

  // ── Clan bank ─────────────────────────────────────────
  defaultBankLimit:  100_000_000,
  bankLimitPerLevel: 50_000_000,    // additional limit per clan level

  // ── Clan leveling ─────────────────────────────────────
  xpPerContribution: 1,         // 1 xp per coin contributed
  xpPerLevel:        10_000,    // xp needed per level

  // ── Clan benefits per level ───────────────────────────
  benefits: {
    1:  { coinBonus: 0.00 },
    5:  { coinBonus: 0.02 },    // +2% coin earnings
    10: { coinBonus: 0.05 },    // +5%
    20: { coinBonus: 0.10 },    // +10%
    50: { coinBonus: 0.20 },    // +20%
  },

};
