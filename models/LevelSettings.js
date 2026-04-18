// ============================================================
//  models/LevelSettings.js
//  Per-guild leveling system configuration
// ============================================================
const mongoose = require("mongoose");

const rolerewardSchema = new mongoose.Schema({
  level:  { type: Number, required: true },
  roleId: { type: String, required: true },
}, { _id: false });

const levelMessageSchema = new mongoose.Schema({
  level:   { type: Number, required: true },
  message: { type: String, required: true },
}, { _id: false });

const multiplierSchema = new mongoose.Schema({
  type:       { type: String, enum: ["role", "user"], required: true },
  targetId:   { type: String, required: true }, // role or user ID
  multiplier: { type: Number, required: true },
}, { _id: false });

const levelSettingsSchema = new mongoose.Schema(
  {
    guildId:           { type: String,  required: true, unique: true },
    enabled:           { type: Boolean, default: false },
    // XP settings
    minXP:             { type: Number,  default: 15   },
    maxXP:             { type: Number,  default: 25   },
    cooldown:          { type: Number,  default: 60   }, // seconds
    // Voice settings
    voiceEnabled:      { type: Boolean, default: false },
    voiceXP:           { type: Number,  default: 10   }, // XP per interval
    voiceInterval:     { type: Number,  default: 60   }, // seconds
    voiceAFKEnabled:   { type: Boolean, default: false },
    voiceMinMembers:   { type: Number,  default: 1    },
    // Blacklists
    blacklistedChannels: { type: [String], default: [] },
    blacklistedRoles:    { type: [String], default: [] },
    // Level up message
    levelUpChannel:    { type: String,  default: null  }, // null = message in same channel
    levelUpDM:         { type: Boolean, default: false },
    levelUpMessage:    { type: String,  default: "GG {user} you reached level **{level}**! 🎉" },
    // Custom per-level messages
    customMessages:    { type: [levelMessageSchema], default: [] },
    // Role rewards
    roleRewards:       { type: [rolerewardSchema],   default: [] },
    // Multipliers
    multipliers:       { type: [multiplierSchema],   default: [] },
    stackMultipliers:  { type: Boolean, default: true },
    // Timezone for weekly reset
    timezone:          { type: String,  default: "UTC" },
    // Weekly reset tracking
    lastWeeklyReset:   { type: Date,    default: null  },
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["LevelSettings"]) return connection.models["LevelSettings"];
  return connection.model("LevelSettings", levelSettingsSchema);
}

module.exports = { fromConnection };
