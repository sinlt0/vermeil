// ============================================================
//  models/BoosterConfig.js
//  Stores booster message and role reward configuration
// ============================================================
const mongoose = require("mongoose");

const embedSchema = new mongoose.Schema({
  title:       { type: String, default: null },
  description: { type: String, default: null },
  color:       { type: String, default: "#F47FFF" }, // Discord Boost Pink
  footer:      { type: String, default: null },
  image:       { type: String, default: null },
  thumbnail:   { type: String, default: null },
  author:      { type: String, default: null },
}, { _id: false });

const boostTypeSchema = new mongoose.Schema({
  enabled:         { type: Boolean, default: false },
  channelId:       { type: String,  default: null  },
  message:         { type: String,  default: null  }, // plain text message
  embed:           { type: embedSchema, default: () => ({}) },
  useEmbed:        { type: Boolean, default: true  },
  cardEnabled:     { type: Boolean, default: false },
  cardBackground:  { type: String,  default: null  },
}, { _id: false });

const boosterConfigSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    boost:   { type: boostTypeSchema, default: () => ({}) },
    unboost: { type: boostTypeSchema, default: () => ({}) },
    // Role rewards mapping: "1" -> "roleID", "2" -> "roleID"
    roleRewards: {
      type: Map,
      of: String,
      default: {},
    },
    // Optional: Log channel for boost events
    logChannelId: { type: String, default: null },

    // Custom Role Settings
    customRoleEnabled:     { type: Boolean, default: false },
    customRoleRequirement: { type: Number,  default: 1 },
    customRoleAnchorId:    { type: String,  default: null }, // Role to place above/below
    customRolePosition:    { type: String,  default: "above", enum: ["above", "below"] },
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["BoosterConfig"]) return connection.models["BoosterConfig"];
  return connection.model("BoosterConfig", boosterConfigSchema);
}

module.exports = { fromConnection };
