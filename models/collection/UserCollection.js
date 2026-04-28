// ============================================================
//  models/collection/UserCollection.js
//  Per-user per-guild harem entry
//  One document per claimed character per user per guild
// ============================================================
const mongoose = require("mongoose");

const userCollectionSchema = new mongoose.Schema({
  guildId:     { type: String, required: true, index: true },
  userId:      { type: String, required: true, index: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: "Character", required: true },

  // Character snapshot (denormalized for display speed)
  name:        { type: String, required: true },
  series:      { type: String, required: true },
  type:        { type: String, enum: ["waifu","husbando"] },

  // Keys system
  keys:        { type: Number, default: 0  },
  soulKeys:    { type: Number, default: 0  },
  // Key perks unlock at: 1,2,3,4,5,6,7,10,15,20,25,30+ keys

  // Customization
  customImageUrl: { type: String, default: null }, // user-set custom image
  imageIndex:     { type: Number, default: 0     }, // which image to show
  note:           { type: String, default: null  }, // harem note ($n)
  alias:          { type: String, default: null  }, // custom alias ($a)
  alias2:         { type: String, default: null  }, // secondary alias ($a2)

  // Position in harem (for $sm sorting)
  position:    { type: Number, default: 0 },

  // Is this their $firstmarry (favorite)
  isFavorite:  { type: Boolean, default: false },

  // When claimed
  claimedAt:   { type: Date, default: Date.now },

  // Soulmate status (global soulmate list)
  isSoulmate:  { type: Boolean, default: false },

}, { timestamps: true });

userCollectionSchema.index({ guildId: 1, userId: 1 });
userCollectionSchema.index({ guildId: 1, characterId: 1 }); // find who owns char in guild
userCollectionSchema.index({ guildId: 1, userId: 1, characterId: 1 }, { unique: true });
userCollectionSchema.index({ guildId: 1, userId: 1, position: 1 });
userCollectionSchema.index({ guildId: 1, userId: 1, keys: -1 });

function fromConnection(connection) {
  if (connection.models["UserCollection"]) return connection.models["UserCollection"];
  return connection.model("UserCollection", userCollectionSchema);
}

module.exports = { fromConnection };
