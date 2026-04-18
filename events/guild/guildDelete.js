// ============================================================
//  events/guild/guildDelete.js
//  Fires when the bot is removed from a guild
// ============================================================
const chalk = require("chalk");

module.exports = {
  name: "guildDelete",
  once: false,

  async execute(client, guild) {
    console.log(chalk.red(`\n  [Guild] ➖ Left: ${guild.name} (${guild.id})`));
    // Guild assignment is intentionally kept in DB
    // so data is preserved if the bot is re-invited
  },
};
