// ============================================================
//  events/client/interactionCreate.js
//  Handles slash command interactions
//
//  Auto-defers if cmd.defer === true OR if command is known
//  to be slow (canvas/transcript/channel ops)
//  Otherwise lets the command reply directly within 3s
// ============================================================
const { runCommand } = require("../../utils/commandRunner");

// Commands that always need a defer due to heavy operations
const ALWAYS_DEFER = new Set([
  "rank", "leaderboard", "ticketpanel", "close",
  "mmclose", "nowplaying",
]);

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.isChatInputCommand()) return;

    const cmd = client.slashCmds.get(interaction.commandName);
    if (!cmd) return;

    // Auto-defer for commands flagged or in the slow list
    const shouldDefer = cmd.defer === true || ALWAYS_DEFER.has(cmd.name);
    if (shouldDefer) {
      await interaction.deferReply({ ephemeral: cmd.ephemeral ?? false }).catch(() => {});
    }

    await runCommand(client, cmd, {
      type:        "slash",
      interaction,
      args:        [],
    });
  },
};
