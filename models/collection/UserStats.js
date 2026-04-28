// ============================================================
//  models/collection/UserStats.js
//  Per-user per-guild stats, kakera, cooldowns, badges
// ============================================================
const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  type:   { type: String, enum: ["bronze","silver","gold","sapphire","ruby","emerald","diamond"] },
  level:  { type: Number, min: 0, max: 4, default: 0 },
  spent:  { type: Number, default: 0 }, // total kakera spent on this badge
}, { _id: false });

const userStatsSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId:  { type: String, required: true },

  // ── Kakera ─────────────────────────────────────────────
  kakera:          { type: Number, default: 0   },
  totalKakeraSent: { type: Number, default: 0   }, // lifetime earned
  kakeraReactPower:{ type: Number, default: 100 }, // % power left (0-100)
  kakeraLastRegen: { type: Date,   default: Date.now }, // for lazy regen calc
  // Power regens 1% per 3 minutes = 100% in 5 hours

  // ── Rolls ───────────────────────────────────────────────
  rollsLeft:       { type: Number, default: 10  }, // rolls per reset
  rollsResetAt:    { type: Date,   default: null }, // when rolls refill
  rollsUsedTotal:  { type: Number, default: 0   }, // lifetime stat

  // ── Claims ──────────────────────────────────────────────
  claimAvailableAt:{ type: Date,   default: null }, // next claim allowed
  lastClaimAt:     { type: Date,   default: null },
  totalClaims:     { type: Number, default: 0   },

  // ── Daily kakera ────────────────────────────────────────
  dailyAvailableAt:{ type: Date,   default: null }, // $dk cooldown
  dailyStreak:     { type: Number, default: 0   },

  // ── Badges ──────────────────────────────────────────────
  badges: {
    bronze:   { type: badgeSchema, default: () => ({ type: "bronze",   level: 0, spent: 0 }) },
    silver:   { type: badgeSchema, default: () => ({ type: "silver",   level: 0, spent: 0 }) },
    gold:     { type: badgeSchema, default: () => ({ type: "gold",     level: 0, spent: 0 }) },
    sapphire: { type: badgeSchema, default: () => ({ type: "sapphire", level: 0, spent: 0 }) },
    ruby:     { type: badgeSchema, default: () => ({ type: "ruby",     level: 0, spent: 0 }) },
    emerald:  { type: badgeSchema, default: () => ({ type: "emerald",  level: 0, spent: 0 }) },
    diamond:  { type: badgeSchema, default: () => ({ type: "diamond",  level: 0, spent: 0 }) },
  },

  // ── Harem customization ──────────────────────────────────
  haremTitle:      { type: String, default: null }, // custom harem title
  likeListTitle:   { type: String, default: null },
  claimMessage:    { type: String, default: null }, // custom claim msg
  divorceMessage:  { type: String, default: null },

  // ── Preferences ─────────────────────────────────────────
  personalRare:    { type: Number, default: 0  }, // 0=default,1=equal rare
  randomImg:       { type: Number, default: 0  }, // image randomization mode
  showKakeraValue: { type: Boolean, default: true },
  showClaimRank:   { type: Boolean, default: false },

  // ── Emerald IV perk: reset claim timer ──────────────────
  emeraldResetUsedAt: { type: Date, default: null },
  emeraldResetCooldown: { type: Number, default: 6 }, // hours

}, { timestamps: true });

userStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["UserStats"]) return connection.models["UserStats"];
  return connection.model("UserStats", userStatsSchema);
}

module.exports = { fromConnection };
