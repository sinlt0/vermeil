// ============================================================
//  models/AntiNukeWhitelist.js
//  Whitelist entries per guild
// ============================================================
const mongoose = require("mongoose");

const whitelistSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, index: true },
  targetId:   { type: String, required: true },
  targetType: { type: String, enum: ["user","role","channel","category","webhook"], required: true },
  targetName: { type: String, default: null },

  // Whitelist types — array of what this target is exempt from
  // "spam"       — spam filters
  // "mentions"   — mention/ping spam
  // "invites"    — posting discord invite links
  // "everyone"   — pinging @everyone / public roles
  // "quarantine" — can touch quarantined members
  // "antinuke"   — exempt from antinuke limits
  // "automod"    — exempt from all automod
  // "total"      — exempt from everything
  types: [{
    type: String,
    enum: ["spam","mentions","invites","everyone","quarantine","antinuke","automod","total"],
  }],

  addedBy:  { type: String, default: null },
  addedAt:  { type: Date,   default: Date.now },
}, { timestamps: true });

whitelistSchema.index({ guildId: 1, targetId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["AntiNukeWhitelist"]) return connection.models["AntiNukeWhitelist"];
  return connection.model("AntiNukeWhitelist", whitelistSchema);
}

module.exports = { fromConnection };
