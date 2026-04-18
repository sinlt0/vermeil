// ============================================================
//  models/AntiNukePermit.js
//  Trust hierarchy — Extra Owners + Trusted Admins per guild
// ============================================================
const mongoose = require("mongoose");

const permitSchema = new mongoose.Schema({
  guildId:   { type: String, required: true, index: true },
  userId:    { type: String, required: true },
  username:  { type: String, default: null },
  level:     {
    type: String,
    enum: ["extra_owner", "trusted_admin"],
    required: true,
  },
  // extra_owner   = static 11 — full owner powers except adding more extra owners
  // trusted_admin = static 10 — 100% immune, bypass all, use all mod commands

  addedBy:   { type: String, default: null }, // userId who added them
  addedAt:   { type: Date,   default: Date.now },
}, { timestamps: true });

permitSchema.index({ guildId: 1, userId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["AntiNukePermit"]) return connection.models["AntiNukePermit"];
  return connection.model("AntiNukePermit", permitSchema);
}

module.exports = { fromConnection };
