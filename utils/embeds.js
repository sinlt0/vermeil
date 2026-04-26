// ============================================================
//  utils/embeds.js
//  Reusable embed builders used across the bot
// ============================================================
const { EmbedBuilder } = require("discord.js");

const COLORS = {
  success: 0x4A3F5F,
  error:   0x4A3F5F,
  warning: 0x4A3F5F,
  info:    0x4A3F5F,
  db:      0x4A3F5F,
};

module.exports = {

  COLORS,

  success(description, title = "<:emoji_41:1492047757404274779> Success") {
    return new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(title)
      .setDescription(description);
  },

  error(description, title = "<:emoji_35:1492047607399317574> Error") {
    return new EmbedBuilder()
      .setColor(COLORS.error)
      .setTitle(title)
      .setDescription(description);
  },

  warning(description, title = "⚠️ Warning") {
    return new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(title)
      .setDescription(description);
  },

  info(description, title = "ℹ️ Info") {
    return new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(title)
      .setDescription(description);
  },

  // Sent when a command requires DB but the guild's cluster is down
  clusterDown(clusterName) {
    return new EmbedBuilder()
      .setColor(COLORS.db)
      .setTitle("<:emoji_44:1492047831400317019> Database Unavailable")
      .setDescription(
        `The database cluster assigned to this server (**${clusterName ?? "unknown"}**) is currently down.\n\n` +
        `We are working on the fix, please be patient.\n` +
        `Commands that don't require the database are still available.`
      )
      .setFooter({ text: "Please try again later." })
      .setTimestamp();
  },

  // DM + server message for emergency cluster migrate (no data transfer)
  clusterMigrated(oldCluster, newCluster) {
    return new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle("⚠️ Server Cluster Changed")
      .setDescription(
        `Due to some internal errors, we were **unable to recover cluster \`${oldCluster}\`**.\n\n` +
        `Your server has been moved to cluster **\`${newCluster}\`**.\n\n` +
        `Please kindly **reconfigure your server settings** as your previous data could not be recovered.`
      )
      .setTimestamp();
  },

  // DM + server message for graceful cluster move (with data transfer)
  clusterMoved(oldCluster, newCluster) {
    return new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle("🔄 Server Cluster Migrated")
      .setDescription(
        `Your server has been **successfully migrated** from cluster \`${oldCluster}\` to cluster \`${newCluster}\`.\n\n` +
        `All your server data has been transferred automatically. No action is required.`
      )
      .setTimestamp();
  },
};
