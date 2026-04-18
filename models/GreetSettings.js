// ============================================================
//  models/GreetSettings.js
//  Stores welcome and leave configuration per guild
// ============================================================
const mongoose = require("mongoose");

const embedSchema = new mongoose.Schema({
  title:       { type: String, default: null },
  description: { type: String, default: null },
  color:       { type: String, default: "#5865F2" },
  footer:      { type: String, default: null },
  image:       { type: String, default: null },  // large image URL or variable
  thumbnail:   { type: String, default: null },  // small image URL or variable
  author:      { type: String, default: null },
}, { _id: false });

const greetTypeSchema = new mongoose.Schema({
  enabled:         { type: Boolean, default: false },
  channelId:       { type: String,  default: null  },
  message:         { type: String,  default: null  }, // plain text message above embed
  embed:           { type: embedSchema, default: () => ({}) },
  useEmbed:        { type: Boolean, default: true  },
  // Card settings
  cardEnabled:     { type: Boolean, default: true  },
  cardBackground:  { type: String,  default: null  }, // null = default gradient
  // DM (welcome only)
  dmEnabled:       { type: Boolean, default: false },
  dmMessage:       { type: String,  default: null  },
}, { _id: false });

const greetSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    welcome: { type: greetTypeSchema, default: () => ({}) },
    leave:   { type: greetTypeSchema, default: () => ({}) },
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["GreetSettings"]) return connection.models["GreetSettings"];
  return connection.model("GreetSettings", greetSettingsSchema);
}

module.exports = { fromConnection };
