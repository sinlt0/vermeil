// ============================================================
//  models/AntiNukeConfig.js
//  Per-guild antinuke configuration
// ============================================================
const mongoose = require("mongoose");

const antiNukeConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },

  // ── Master toggle ─────────────────────────────────────
  enabled: { type: Boolean, default: true },

  // ── Statics ───────────────────────────────────────────
  quarantineRoleId:  { type: String, default: null },
  mainRoles:         [{ type: String }],
  logChannelId:      { type: String, default: null },
  modLogChannelId:   { type: String, default: null },
  mainChannelId:     { type: String, default: null },
  partnerChannelIds: [{ type: String }],
  panicPingRoles:    [{ type: String }],
  whitelistedCategories: [{ type: String }], // ticket bot categories etc

  // ── Filters ───────────────────────────────────────────
  filters: {
    // Filter 2 — mass channel create/delete
    massChannel: {
      enabled:    { type: Boolean, default: true },
      limit:      { type: Number,  default: 3    }, // actions before quarantine
      timeWindow: { type: Number,  default: 5000 }, // ms window
    },
    // Filter 3 — mass role create/delete
    massRole: {
      enabled:    { type: Boolean, default: true },
      limit:      { type: Number,  default: 3    },
      timeWindow: { type: Number,  default: 5000 },
    },
    // Filter 4a — prune protection
    pruneProtection: {
      enabled: { type: Boolean, default: true },
    },
    // Filter 4b — quarantine hold (protect quarantined members)
    quarantineHold: {
      enabled: { type: Boolean, default: true },
    },
    // Filter 5a — mass ban/kick
    massBanKick: {
      enabled:    { type: Boolean, default: true },
      limit:      { type: Number,  default: 3    },
      timeWindow: { type: Number,  default: 5000 },
    },
    // Filter 5b — strict mode (dangerous perms on ANY role) — premium
    strictMode: {
      enabled: { type: Boolean, default: false },
    },
    // Filter 5c — monitor public roles (@everyone + main roles)
    monitorPublicRoles: {
      enabled: { type: Boolean, default: false },
    },
    // Filter 6 — monitor channel permission overrides
    monitorChannelPerms: {
      enabled: { type: Boolean, default: false },
    },
    // Webhook mass create/delete
    massWebhook: {
      enabled:    { type: Boolean, default: true },
      limit:      { type: Number,  default: 3   },
      timeWindow: { type: Number,  default: 5000 },
    },
    // Emoji mass create/delete
    massEmoji: {
      enabled:    { type: Boolean, default: true },
      limit:      { type: Number,  default: 5   },
      timeWindow: { type: Number,  default: 5000 },
    },
  },

  // ── Panic mode ────────────────────────────────────────
  panicMode: {
    active:       { type: Boolean, default: false },
    triggeredAt:  { type: Date,    default: null  },
    triggeredBy:  { type: String,  default: null  }, // userId
    reason:       { type: String,  default: null  },
  },

  // ── Setup state ───────────────────────────────────────
  setupCompleted: { type: Boolean, default: false },
  setupAt:        { type: Date,    default: null  },

}, { timestamps: true });

function fromConnection(connection) {
  if (connection.models["AntiNukeConfig"]) return connection.models["AntiNukeConfig"];
  return connection.model("AntiNukeConfig", antiNukeConfigSchema);
}

module.exports = { fromConnection };
