// ============================================================
//  models/collector/CollectorSettings.js
//  Guild-wide configuration for the collection system
// ============================================================
const mongoose = require("mongoose");

const collectorSettingsSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  
  enabled: { type: Boolean, default: true },
  
  // Customization
  rollResetMinutes:  { type: Number, default: 60 },
  claimResetMinutes: { type: Number, default: 180 },
  
  // Channels
  spawnChannelId: { type: String, default: null }, // If set, rolls only work here
});

function fromConnection(connection) {
  if (connection.models["CollectorSettings"]) return connection.models["CollectorSettings"];
  return connection.model("CollectorSettings", collectorSettingsSchema);
}

module.exports = { fromConnection };
