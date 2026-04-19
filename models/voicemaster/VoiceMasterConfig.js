const mongoose = require("mongoose");

const voiceMasterConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null }, // The "Join to Create" channel
  categoryId: { type: String, default: null }, // Where new channels are born
  interfaceChannelId: { type: String, default: null }, // Dedicated control panel channel
  defaultName: { type: String, default: "{user}'s Lounge" },
  defaultLimit: { type: Number, default: 0 },
});

function fromConnection(connection) {
  if (connection.models["VoiceMasterConfig"]) return connection.models["VoiceMasterConfig"];
  return connection.model("VoiceMasterConfig", voiceMasterConfigSchema);
}

module.exports = { fromConnection };
