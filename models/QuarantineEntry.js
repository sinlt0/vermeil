// ============================================================
//  models/QuarantineEntry.js
//  Active quarantine entries per guild
// ============================================================
const mongoose = require("mongoose");

const quarantineSchema = new mongoose.Schema({
  guildId:      { type: String, required: true, index: true },
  userId:       { type: String, required: true },
  userTag:      { type: String, default: null },

  reason:       { type: String, default: "Antinuke violation" },
  filter:       { type: String, default: null }, // which filter triggered it
  quarantinedBy:{ type: String, default: "AUTO" }, // "AUTO" or userId

  // Saved roles to restore if ever pardoned
  savedRoles:   [{ type: String }],

  quarantinedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

quarantineSchema.index({ guildId: 1, userId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["QuarantineEntry"]) return connection.models["QuarantineEntry"];
  return connection.model("QuarantineEntry", quarantineSchema);
}

module.exports = { fromConnection };
