// ============================================================
//  models/BoosterMember.js
//  Tracks individual user boost counts per guild
// ============================================================
const mongoose = require("mongoose");

const boosterMemberSchema = new mongoose.Schema(
  {
    guildId:    { type: String, required: true },
    userId:     { type: String, required: true },
    boostCount: { type: Number, default: 0 },
    lastBoost:  { type: Date,   default: null },
    customRoleId: { type: String, default: null },
  },
  { timestamps: true }
);

// Compound index for fast lookup
boosterMemberSchema.index({ guildId: 1, userId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["BoosterMember"]) return connection.models["BoosterMember"];
  return connection.model("BoosterMember", boosterMemberSchema);
}

module.exports = { fromConnection };
