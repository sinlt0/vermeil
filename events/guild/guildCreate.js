// ============================================================
//  events/guild/guildCreate.js
//  Fires when the bot joins a new guild
//  Auto-assigns the guild to a random available DB cluster
// ============================================================
const chalk = require("chalk");

module.exports = {
  name: "guildCreate",
  once: false,

  async execute(client, guild) {
    console.log(chalk.green(`\n  [Guild] ➕ Joined: ${guild.name} (${guild.id})`));

    if (!client.db) return;

    try {
      // Check if already assigned (e.g. bot was kicked and re-added)
      const existing = await client.db.getGuildDb(guild.id);
      if (existing) {
        console.log(chalk.gray(`  [DB] Guild ${guild.name} already assigned to ${existing.clusterName}`));
        return;
      }

      const clusterName = await client.db.assignGuild(guild.id);
      console.log(chalk.cyan(`  [DB] Assigned ${guild.name} → ${clusterName}`));
    } catch (err) {
      console.error(chalk.red(`  [DB] Failed to assign ${guild.name}:`), err.message);
    }
  },
};
