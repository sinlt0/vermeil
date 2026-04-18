// ============================================================
//  models/UserLevel.js
//  Per-user XP and level data per guild
// ============================================================
const mongoose = require("mongoose");

const userLevelSchema = new mongoose.Schema(
  {
    guildId:   { type: String, required: true },
    userId:    { type: String, required: true },
    xp:        { type: Number, default: 0     },
    level:     { type: Number, default: 0     },
    totalXP:   { type: Number, default: 0     }, // all time XP (never resets)
    weeklyXP:  { type: Number, default: 0     }, // resets every Monday
    lastMessage:{ type: Date,  default: null  }, // cooldown tracking
    xpBarColor:{ type: String, default: null  }, // user custom hex color
  },
  { timestamps: true }
);

userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });
userLevelSchema.index({ guildId: 1, xp: -1 });
userLevelSchema.index({ guildId: 1, weeklyXP: -1 });

function fromConnection(connection) {
  if (connection.models["UserLevel"]) return connection.models["UserLevel"];
  return connection.model("UserLevel", userLevelSchema);
}

module.exports = { fromConnection };
