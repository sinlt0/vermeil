// ============================================================
//  models/collector/CollectorUser.js
//  Tracks user-specific gacha stats and cooldowns
// ============================================================
const mongoose = require("mongoose");

const collectorUserSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId:  { type: String, required: true, index: true },
  
  // Rolling Stats
  rollsAvailable: { type: Number, default: 10 },
  maxRolls:       { type: Number, default: 10 },
  lastRollReset:  { type: Date,   default: Date.now },
  
  // Claiming Stats
  claimsAvailable: { type: Number, default: 1 },
  lastClaimReset:  { type: Date,   default: Date.now },
  
  // Leveling/Wishlist
  wishlist: [{ type: Number }], // Character IDs
  totalClaims: { type: Number, default: 0 },
});

collectorUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["CollectorUser"]) return connection.models["CollectorUser"];
  return connection.model("CollectorUser", collectorUserSchema);
}

module.exports = { fromConnection };
