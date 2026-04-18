// ============================================================
//  ecomodels/UserProfile.js
//  Core user economy profile — global across all servers
// ============================================================
const mongoose = require("mongoose");

const cooldownSchema = new mongoose.Schema({
  daily:      { type: Date, default: null },
  weekly:     { type: Date, default: null },
  work:       { type: Date, default: null },
  hunt:       { type: Date, default: null },
  battle:     { type: Date, default: null },
  crime:      { type: Date, default: null },
  rob:        { type: Date, default: null },
  beg:        { type: Date, default: null },
  heist:      { type: Date, default: null },
  slots:      { type: Date, default: null },
  coinflip:   { type: Date, default: null },
  blackjack:  { type: Date, default: null },
  dice:       { type: Date, default: null },
  quest:      { type: Date, default: null },
  vote:       { type: Date, default: null },
}, { _id: false });

const statsSchema = new mongoose.Schema({
  // Earnings
  coinsEarned:    { type: Number, default: 0 },
  coinsSpent:     { type: Number, default: 0 },
  gemsEarned:     { type: Number, default: 0 },
  tokensEarned:   { type: Number, default: 0 },
  // Activities
  huntsTotal:     { type: Number, default: 0 },
  battlesWon:     { type: Number, default: 0 },
  battlesLost:    { type: Number, default: 0 },
  crimesTotal:    { type: Number, default: 0 },
  crimesSuccess:  { type: Number, default: 0 },
  robsTotal:      { type: Number, default: 0 },
  robsSuccess:    { type: Number, default: 0 },
  worksTotal:     { type: Number, default: 0 },
  gamblesWon:     { type: Number, default: 0 },
  gamblesLost:    { type: Number, default: 0 },
  questsDone:     { type: Number, default: 0 },
  itemsUsed:      { type: Number, default: 0 },
  dailyClaimed:   { type: Number, default: 0 },
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true, index: true },
  username:     { type: String, default: null },

  // ── Currencies ───────────────────────────────────────
  wallet:       { type: Number, default: 0,   min: 0 },
  bank:         { type: Number, default: 0,   min: 0 },
  bankLimit:    { type: Number, default: null }, // null = use config default
  gems:         { type: Number, default: 0,   min: 0 },
  tokens:       { type: Number, default: 0,   min: 0 },

  // ── Progression ──────────────────────────────────────
  level:        { type: Number, default: 1,   min: 1 },
  xp:           { type: Number, default: 0,   min: 0 },
  prestige:     { type: Number, default: 0,   min: 0 },

  // ── Protection ───────────────────────────────────────
  robProtection:    { type: Boolean, default: false },
  robProtectionExp: { type: Date,    default: null  }, // expiry time

  // ── Relationships ─────────────────────────────────────
  marriedTo:    { type: String,  default: null },
  marriedAt:    { type: Date,    default: null },
  clanId:       { type: String,  default: null },

  // ── Profile cosmetics ────────────────────────────────
  title:        { type: String,  default: null },
  background:   { type: String,  default: "default" },

  // ── Tracking ─────────────────────────────────────────
  stats:        { type: statsSchema,    default: () => ({}) },
  cooldowns:    { type: cooldownSchema, default: () => ({}) },

  // ── TOS/Privacy agreement ─────────────────────────────
  agreedToTos:  { type: Boolean, default: false },
  agreedAt:     { type: Date,    default: null  },

  // ── Anti-cheat flags ──────────────────────────────────
  flags: [{
    reason:    { type: String },
    timestamp: { type: Date, default: Date.now },
    severity:  { type: Number, default: 1 },
  }],

  lastActive: { type: Date, default: Date.now },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────
userProfileSchema.index({ wallet: -1 });
userProfileSchema.index({ level:  -1 });
userProfileSchema.index({ gems:   -1 });

module.exports = userProfileSchema;
