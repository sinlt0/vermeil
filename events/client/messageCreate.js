// ============================================================
//  events/client/messageCreate.js
//  Dual-prefix routing with conflict resolution
//
//  Rules:
//  1. "$" prefix → collection commands ONLY
//     - If command name exists in BOTH collection + another cat
//       → $ runs the collection one, server prefix runs the other
//     - If command name exists ONLY in another cat → $ ignored
//     - If command name exists ONLY in collection → $ works
//
//  2. Server prefix / no-prefix → all non-collection commands
//     - If command name exists in BOTH collection + another cat
//       → server prefix runs the non-collection one
//     - If command name exists ONLY in collection → blocked
//
//  Examples:
//    $waifu   → runs collection/waifu (even if nsfw/waifu exists)
//    !waifu   → runs nsfw/waifu (blocks collection/waifu)
//    $marry   → runs collection/marry (even if economy/marry exists)
//    !marry   → runs economy/marry (blocks collection/marry)
//    $ban     → ignored (ban is not collection)
//    !waifu   → if no nsfw/waifu exists, ignored (collection blocked)
// ============================================================
const { runCommand }     = require("../../utils/commandRunner");
const { hasNoPrefix }    = require("../../utils/permissions");
const { fromConnection } = require("../../models/GuildSettings");

const COLLECTION_PREFIX   = "$";
const COLLECTION_CATEGORY = "collection";

// ============================================================
//  Find a command by name, optionally filtering by category
// ============================================================
function findCommand(client, commandName, categoryFilter = null) {
  // Check direct name match
  const resolveAndGet = (name) => {
    const resolved = client.aliases.get(name) || name;
    return client.commands.get(resolved);
  };

  // Get all commands matching this name/alias across categories
  const cmd = resolveAndGet(commandName);
  if (!cmd) return null;

  if (categoryFilter === null) return cmd;

  if (categoryFilter === COLLECTION_CATEGORY) {
    return cmd.category?.toLowerCase() === COLLECTION_CATEGORY ? cmd : null;
  }

  // Non-collection filter: return cmd only if NOT collection
  if (cmd.category?.toLowerCase() === COLLECTION_CATEGORY) {
    // Conflict: same name exists as collection. Find a non-collection version.
    // Since commands map resolves to one cmd, we need to scan all commands
    // to find a non-collection one with the same name or alias
    for (const [, c] of client.commands) {
      if (c.category?.toLowerCase() === COLLECTION_CATEGORY) continue;
      if (
        c.name === commandName ||
        c.aliases?.includes(commandName)
      ) return c;
    }
    return null; // no non-collection version found — block
  }

  return cmd;
}

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;

    const content = message.content.trim();
    if (!content)  return;

    // ── Route 1: $ prefix → collection ONLY ───────────────
    if (content.startsWith(COLLECTION_PREFIX) && !content.startsWith(COLLECTION_PREFIX + COLLECTION_PREFIX)) {
      const slice = content.slice(COLLECTION_PREFIX.length).trim();
      if (!slice) return;

      const args        = slice.split(/\s+/);
      const commandName = args.shift().toLowerCase();
      if (!commandName) return;

      // Only run if a collection version of this command exists
      const cmd = findCommand(client, commandName, COLLECTION_CATEGORY);
      if (!cmd) return; // no collection command with this name → ignore

      return runCommand(client, cmd, {
        type:        "prefix",
        message,
        args,
        commandName,
        prefix:      COLLECTION_PREFIX,
      });
    }

    // ── Route 2: Server prefix / no-prefix → non-collection ─
    let prefix = client.config.prefix;

    if (client.db) {
      try {
        const guildDb = await client.db.getGuildDb(message.guild.id);
        if (guildDb && !guildDb.isDown) {
          const GuildSettingsModel = fromConnection(guildDb.connection);
          const settings = await GuildSettingsModel.findOne({ guildId: message.guild.id });
          if (settings?.prefix) prefix = settings.prefix;
        }
      } catch {}
    }

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

    // Find a non-collection version — conflict resolution built in
    const cmd = findCommand(client, commandName, "non-collection");
    if (!cmd) return;

    return runCommand(client, cmd, {
      type:    "prefix",
      message,
      args,
      prefix,
    });
  },
};
