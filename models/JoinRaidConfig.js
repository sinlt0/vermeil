// ============================================================
//  models/JoinRaidConfig.js
//  Per-guild join raid configuration
// ============================================================
const mongoose = require("mongoose");

const joinRaidConfigSchema = new mongoose.Schema({
  guildId:  { type: String, required: true, unique: true, index: true },
  enabled:  { type: Boolean, default: false },
  premium:  { type: Boolean, default: false }, // toggle premium-only restriction

  // Detection settings
  threshold:   { type: Number, default: 10    }, // accounts to trigger
  windowHours: { type: Number, default: 1     }, // track joins in past X hours
  action:      { type: String, enum: ["timeout","kick","ban"], default: "kick" },

  // Ping roles on trigger
  warnRoles: [{ type: String }],

  // State
  active:       { type: Boolean, default: false }, // currently in raid mode
  triggeredAt:  { type: Date,    default: null  },

}, { timestamps: true });

function fromConnection(connection) {
  if (connection.models["JoinRaidConfig"]) return connection.models["JoinRaidConfig"];
  return connection.model("JoinRaidConfig", joinRaidConfigSchema);
}

module.exports = { fromConnection };
