// ============================================================
//  models/AutoModConfig.js
//  Per-guild automod configuration
// ============================================================
const mongoose = require("mongoose");

const autoModConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },

  // ── Master toggle ──────────────────────────────────────
  enabled: { type: Boolean, default: true },

  // ── Log channel ────────────────────────────────────────
  logChannelId: { type: String, default: null },

  // ── Heat settings ──────────────────────────────────────
  heat: {
    maxPercent:      { type: Number, default: 100  }, // trigger at 100%
    degradationRate: { type: Number, default: 5    }, // % lost per second (lazy eval)
    strikeTimeout:   { type: Number, default: 3600  }, // seconds for regular strike
    capTimeout:      { type: Number, default: 86400 }, // seconds for cap strike (1 day)
    capCount:        { type: Number, default: 3     }, // strikes before cap
    multiplier:      { type: Number, default: 1     }, // timeout multiplier
  },

  // ── Anti-spam filters ──────────────────────────────────
  filters: {
    // [2] Anti-spam master toggle
    antiSpam: { type: Boolean, default: true },

    // Individual spam sub-filters
    normalMessage:    { type: Boolean, default: true },
    similarMessage:   { type: Boolean, default: true },
    emojiSpam:        { type: Boolean, default: true },
    messageChars:     { type: Boolean, default: true }, // wall of text
    newLines:         { type: Boolean, default: true }, // excessive newlines
    inactiveChannel:  { type: Boolean, default: true }, // spamming quiet channels
    mentions:         { type: Boolean, default: true }, // @user/@role spam
    attachments:      { type: Boolean, default: true }, // image/file spam

    // [3] Invite links — instant punishment
    inviteLinks:      { type: Boolean, default: true },
    inviteAction:     { type: String, enum: ["timeout","kick","ban","warn"], default: "timeout" },

    // [4] NSFW/phishing/malicious links
    maliciousLinks:   { type: Boolean, default: true },
    maliciousAction:  { type: String, enum: ["timeout","kick","ban"], default: "ban" },

    // [5] @everyone / public role mentions
    everyoneMention:  { type: Boolean, default: true },
    everyoneAction:   { type: String, enum: ["timeout","kick","ban","warn"], default: "timeout" },

    // [6] Webhooks — treated more harshly
    webhookSpam:      { type: Boolean, default: true },

    // Delete message on trigger
    deleteOnTrigger:  { type: Boolean, default: true },
  },

  // ── Punishment (global default) ────────────────────────
  punishment: {
    action:   { type: String, enum: ["timeout","kick","ban"], default: "timeout" },
    deleteMsg:{ type: Boolean, default: true },
  },

  // ── Join Gate settings ─────────────────────────────────
  // Stored in JoinGateConfig model

  // ── Premium-only features ──────────────────────────────
  premiumOnly: {
    joinRaid:      { type: Boolean, default: false }, // restrict joinraid to premium
    heatSettings:  { type: Boolean, default: false }, // restrict heat tweaking
  },

}, { timestamps: true });

function fromConnection(connection) {
  if (connection.models["AutoModConfig"]) return connection.models["AutoModConfig"];
  return connection.model("AutoModConfig", autoModConfigSchema);
}

module.exports = { fromConnection };
