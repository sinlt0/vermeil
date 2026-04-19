// ============================================================
//  models/JoinGateConfig.js
//  Per-guild join gate configuration
// ============================================================
const mongoose = require("mongoose");

const joinGateConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },

  // [1] No avatar accounts
  noAvatar: {
    enabled: { type: Boolean, default: false },
    action:  { type: String, enum: ["timeout","kick","ban"], default: "kick" },
  },

  // [2] New account filter
  newAccount: {
    enabled:   { type: Boolean, default: false },
    minAgeDays:{ type: Number,  default: 7     }, // min account age in days
    action:    { type: String, enum: ["timeout","kick","ban"], default: "kick" },
    showDaysInDm: { type: Boolean, default: true }, // w!jg 3d ?on equivalent
  },

  // [3] Suspicious accounts
  suspicious: {
    enabled: { type: Boolean, default: false },
    action:  { type: String, enum: ["timeout","kick","ban"], default: "kick" },
  },

  // [4] Bot additions filter
  botAdditions: {
    enabled: { type: Boolean, default: false },
    action:  { type: String, enum: ["timeout","kick","ban"], default: "kick" },
  },

  // [5] Advertising usernames (discord.gg in username)
  adUsername: {
    enabled: { type: Boolean, default: false },
    action:  { type: String, enum: ["timeout","kick","ban"], default: "kick" },
  },

  // [6] Unverified bot filter
  unverifiedBots: {
    enabled: { type: Boolean, default: false },
    action:  { type: String, enum: ["timeout","kick","ban"], default: "kick" },
  },

}, { timestamps: true });

function fromConnection(connection) {
  if (connection.models["JoinGateConfig"]) return connection.models["JoinGateConfig"];
  return connection.model("JoinGateConfig", joinGateConfigSchema);
}

module.exports = { fromConnection };
