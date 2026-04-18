// ============================================================
//  ecoconfiguration/marriage.js
//  Marriage + Bond system settings
// ============================================================
module.exports = {

  // ── Marriage ──────────────────────────────────────────
  marriageCost:      1_000_000,    // coins to propose
  divorceCost:       500_000,     // coins to divorce
  marriageBonus:     0.05,      // +5% coin earning bonus when grinding together

  // ── Bond system ───────────────────────────────────────
  bondCost:          500_000,     // coins to create a bond
  breakBondCost:     200_000,
  maxBonds:          5,         // max bonds per user

  // ── Bond levels + perks ───────────────────────────────
  bondXpPerActivity: 10,        // xp gained when both bonded users are active
  bondXpPerLevel:    500,

  bondPerks: [
    { level: 1,  perkId: "shared_daily",     description: "+10% daily reward when partner is online" },
    { level: 5,  perkId: "xp_share",         description: "Share 10% XP with bond partner"           },
    { level: 10, perkId: "hunt_assist",       description: "+5% rare creature chance on hunts"        },
    { level: 20, perkId: "coin_share",        description: "Earn 5% of partner's work income"         },
    { level: 50, perkId: "ultimate_bond",     description: "+20% all earnings when grinding together" },
  ],

};
