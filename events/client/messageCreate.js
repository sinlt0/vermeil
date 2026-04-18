// ============================================================
//  events/client/messageCreate.js
//  Handles prefix command parsing and dispatching
//  Supports:
//    - Per-server custom prefix (stored in DB)
//    - Global prefix fallback (config.js)
//    - No-prefix users
// ============================================================
const { runCommand }              = require("../../utils/commandRunner");
const { hasNoPrefix }             = require("../../utils/permissions");
const { fromConnection } = require("../../models/GuildSettings");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;

    // ── Resolve prefix for this guild ─────────────────────
    // Check DB for a custom prefix, fall back to config prefix
    let prefix = client.config.prefix;

    if (client.db) {
      try {
        const guildDb = await client.db.getGuildDb(message.guild.id);
        if (guildDb && !guildDb.isDown) {
          const GuildSettingsModel = fromConnection(guildDb.connection);
          const settings = await GuildSettingsModel.findOne({ guildId: message.guild.id });
          if (settings?.prefix) prefix = settings.prefix;
        }
      } catch {} // silently fall back to global prefix
    }

    const content  = message.content.trim();
    const noPrefix = hasNoPrefix(client, message.author.id);

    let commandName, args;

    if (content.startsWith(prefix)) {
      const slice = content.slice(prefix.length).trim();
      if (!slice) return;
      args        = slice.split(/\s+/);
      commandName = args.shift().toLowerCase();
    } else if (noPrefix) {
      args        = content.split(/\s+/);
      commandName = args.shift().toLowerCase();
    } else {
      return;
    }

    if (!commandName) return;

    const resolvedName = client.aliases.get(commandName) || commandName;
    const cmd          = client.commands.get(resolvedName);
    if (!cmd) return;

    await runCommand(client, cmd, {
      type: "prefix",
      message,
      args,
      prefix, // pass resolved prefix so commands can reference it
    });
  },
};
