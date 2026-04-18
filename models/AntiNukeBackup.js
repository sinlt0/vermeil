// ============================================================
//  models/AntiNukeBackup.js
//  Server structure snapshots for restore system
// ============================================================
const mongoose = require("mongoose");

const channelBackupSchema = new mongoose.Schema({
  id:           String,
  name:         String,
  type:         Number,
  position:     Number,
  parentId:     String,
  topic:        String,
  nsfw:         Boolean,
  rateLimitPerUser: Number,
  permissionOverwrites: [{ id: String, type: Number, allow: String, deny: String }],
}, { _id: false });

const roleBackupSchema = new mongoose.Schema({
  id:          String,
  name:        String,
  color:       Number,
  hoist:       Boolean,
  position:    Number,
  permissions: String,
  mentionable: Boolean,
  managed:     Boolean,
}, { _id: false });

const backupSchema = new mongoose.Schema({
  guildId:     { type: String, required: true, index: true },
  label:       { type: String, default: "Auto Backup" },
  createdBy:   { type: String, default: null }, // null = automatic

  // Server info
  name:        { type: String, default: null },
  icon:        { type: String, default: null },
  verificationLevel: { type: Number, default: 0 },

  // Structure
  channels:    [channelBackupSchema],
  roles:       [roleBackupSchema],

  // Meta
  channelCount: { type: Number, default: 0 },
  roleCount:    { type: Number, default: 0 },
  automated:    { type: Boolean, default: true },
}, { timestamps: true });

// Keep max 10 backups per guild — enforced in code
backupSchema.index({ guildId: 1, createdAt: -1 });

function fromConnection(connection) {
  if (connection.models["AntiNukeBackup"]) return connection.models["AntiNukeBackup"];
  return connection.model("AntiNukeBackup", backupSchema);
}

module.exports = { fromConnection };
