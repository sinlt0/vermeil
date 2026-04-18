// ============================================================
//  handlers/slashDeploy.js
//  Deploys slash commands globally once the bot is ready
// ============================================================
const { REST, Routes } = require("discord.js");
const chalk = require("chalk");

module.exports = (client) => {
  client.once("ready", async () => {
    const slashData = [];

    for (const [, cmd] of client.slashCmds) {
      if (cmd.slashData) slashData.push(cmd.slashData);
    }

    if (slashData.length === 0) {
      console.log(chalk.gray("  [Slash] No slash commands to deploy."));
      return;
    }

    try {
      const rest = new REST({ version: "10" }).setToken(client.token);
      await rest.put(Routes.applicationCommands(client.user.id), { body: slashData });
      console.log(chalk.green(`  [Slash] ✅ Deployed ${slashData.length} slash command(s) globally.`));
    } catch (err) {
      console.error(chalk.red("  [Slash] ❌ Failed to deploy slash commands:"), err.message);
    }
  });
};
