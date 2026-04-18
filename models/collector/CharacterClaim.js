// ============================================================
//  models/CharacterClaim.js
//  Tracks claimed characters within guilds
// ============================================================
const mongoose = require("mongoose");

const characterClaimSchema = new mongoose.Schema({
  guildId: { 
    type: String, 
    required: true, 
    index: true 
  },
  characterId: { 
    type: Number, 
    required: true 
  },
  characterName: { 
    type: String, 
    required: true 
  },
  characterImage: String,
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  claimedAt: { 
    type: Date, 
    default: Date.now 
  },
  // Optional: tracking value or level of the card
  rarity: { 
    type: String, 
    default: "Common" 
  },
});

// Ensure a character can only be claimed once per server
characterClaimSchema.index({ guildId: 1, characterId: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["CharacterClaim"]) return connection.models["CharacterClaim"];
  return connection.model("CharacterClaim", characterClaimSchema);
}

module.exports = { fromConnection };
