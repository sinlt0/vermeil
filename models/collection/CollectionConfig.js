// ============================================================
//  models/collection/CollectionConfig.js
//  Per-guild collection system configuration
// ============================================================
const mongoose = require("mongoose");

const collectionConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  // Roll settings
  rollsPerReset:    { type: Number, default: 10    }, // rolls per hour
  rollResetMinutes: { type: Number, default: 60    }, // reset every N minutes
  claimCooldownHrs: { type: Number, default: 3     }, // 3 hours between claims
  haremLimit:       { type: Number, default: 2000  }, // max chars per user

  // Character pool
  allowWaifu:       { type: Boolean, default: true  },
  allowHusbando:    { type: Boolean, default: true  },
  allowAnime:       { type: Boolean, default: true  },
  allowGame:        { type: Boolean, default: true  },
  allowManga:       { type: Boolean, default: true  },
  allowNsfw:        { type: Boolean, default: false },

  // Anti-snipe (claim lock window in seconds after roll)
  claimWindowSecs:  { type: Number, default: 30    },

  // Kakera settings
  kakeraEnabled:    { type: Boolean, default: true  },
  kakeraSpawnChance:{ type: Number, default: 35    }, // % chance kakera spawns on claimed roll
  badgeCostMultiplier: { type: Number, default: 1  },

  // Roll channels (empty = all channels)
  rollChannels:     [{ type: String }],

  // Game mode (0=all, 2=limited pool)
  gameMode:         { type: Number, default: 0 },

  // Enabled
  enabled:          { type: Boolean, default: true },

}, { timestamps: true });

function fromConnection(connection) {
  if (connection.models["CollectionConfig"]) return connection.models["CollectionConfig"];
  return connection.model("CollectionConfig", collectionConfigSchema);
}

module.exports = { fromConnection };
