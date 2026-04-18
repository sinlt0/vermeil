// ============================================================
//  models/GuildSettings.js
//  Per-guild settings schema
//
//  IMPORTANT: This bot uses isolated per-cluster connections
//  via mongoose.createConnection(). Never use mongoose.model()
//  directly — always use GuildSettings.fromConnection(conn)
//  with the connection returned by client.db.getGuildDb()
// ============================================================
const mongoose = require("mongoose");

const guildSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    prefix:  { type: String, default: null }, // null = fall back to config prefix
    modLogChannel:{ type: String, default: null },    // channel ID for mod logs
 },
  { timestamps: true }
);

/**
 * Returns the GuildSettings model bound to a specific cluster connection.
 * Reuses the already-registered model if it exists on that connection
 * to avoid "Cannot overwrite model" errors.
 *
 * Usage:
 *   const guildDb = await client.db.getGuildDb(guildId);
 *   const GuildSettings = fromConnection(guildDb.connection);
 *   const settings = await GuildSettings.findOne({ guildId });
 */
function fromConnection(connection) {
  if (connection.models["GuildSettings"]) {
    return connection.models["GuildSettings"];
  }
  return connection.model("GuildSettings", guildSettingsSchema);
}

module.exports = { fromConnection };
