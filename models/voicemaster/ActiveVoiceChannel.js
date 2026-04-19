const mongoose = require("mongoose");

const activeVoiceChannelSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, unique: true, index: true },
  ownerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

function fromConnection(connection) {
  if (connection.models["ActiveVoiceChannel"]) return connection.models["ActiveVoiceChannel"];
  return connection.model("ActiveVoiceChannel", activeVoiceChannelSchema);
}

module.exports = { fromConnection };
