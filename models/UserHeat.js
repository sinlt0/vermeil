// ============================================================
//  models/UserHeat.js
//  Per-user heat tracking per guild
//  Uses lazy evaluation — no intervals needed
// ============================================================
const mongoose = require("mongoose");

const userHeatSchema = new mongoose.Schema({
  guildId:      { type: String, required: true },
  userId:       { type: String, required: true },

  // Current heat state
  heat:         { type: Number, default: 0     }, // current heat %
  lastUpdated:  { type: Date,   default: Date.now },

  // Strike tracking
  strikeCount:  { type: Number, default: 0     }, // how many times triggered
  lastStrike:   { type: Date,   default: null  }, // last trigger time

  // Timeout tracking (to know if already timed out)
  timedOutUntil:{ type: Date,   default: null  },

}, { timestamps: true });

userHeatSchema.index({ guildId: 1, userId: 1 }, { unique: true });
// Auto-cleanup heat records after 7 days of inactivity
userHeatSchema.index({ lastUpdated: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

function fromConnection(connection) {
  if (connection.models["UserHeat"]) return connection.models["UserHeat"];
  return connection.model("UserHeat", userHeatSchema);
}

module.exports = { fromConnection };
