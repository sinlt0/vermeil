// ============================================================
//  utils/commandRunner.js
//  Central command execution pipeline
// ============================================================
const embeds = require("./embeds");
const { isOwner, isDev } = require("./permissions");
const { logCommand } = require("./loggingUtils");
const { isPremium, premiumEmbed } = require("./premiumUtils");

// ============================================================
//  Smart reply — handles all interaction states
// ============================================================
async function reply(ctx, payload) {
  if (ctx.type === "prefix") {
    return ctx.message.reply(payload);
  }

  const i = ctx.interaction;

  // Already deferred or replied → editReply
  if (i.deferred || i.replied) {
    return i.editReply(payload);
  }

  // Not yet replied → reply()
  return i.reply(payload);
}

// ============================================================
//  Run a command through the full middleware pipeline
// ============================================================
async function runCommand(client, cmd, ctx) {
  const userId  = ctx.type === "prefix"
    ? ctx.message.author.id
    : ctx.interaction.user.id;

  const guildId = ctx.type === "prefix"
    ? ctx.message.guild?.id
    : ctx.interaction.guild?.id;

  // ── 1. Owner-only guard ────────────────────────────────
  if (cmd.ownerOnly && !isOwner(client, userId)) {
    return reply(ctx, { embeds: [embeds.error("This command is restricted to the bot owner.")] });
  }

  // ── 2. Dev-only guard ──────────────────────────────────
  if (cmd.devOnly && !isDev(client, userId)) {
    return reply(ctx, { embeds: [embeds.error("This command is restricted to bot developers.")] });
  }
  
  // ── 3. Premium check ───────────────────────────────
  if (cmd.premium && guildId) {
    const bypass = isOwner(client, userId) || isDev(client, userId);
    if (!bypass) {
      const hasPremium = await isPremium(client, guildId);
      if (!hasPremium) {
        return reply(ctx, { embeds: [premiumEmbed()], ephemeral: true });
      }
    }
  }

  // ── 3. Database availability check ────────────────────
  if (cmd.requiresDatabase && guildId && client.db) {
    let guildDb = await client.db.getGuildDb(guildId);

    if (!guildDb) {
      try {
        await client.db.assignGuild(guildId);
        guildDb = await client.db.getGuildDb(guildId);
      } catch {
        return reply(ctx, {
          embeds: [embeds.error("No database clusters are available right now. Please try again later.")],
        });
      }
    }

    if (guildDb?.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb.clusterName)] });
    }
  }

  // ── 4. Execute ─────────────────────────────────────────
  try {
    await cmd.execute(client, ctx);
    // 📢 LOG COMMAND USAGE
    await logCommand(ctx, cmd.name).catch(() => null);
  } catch (err) {
    console.error(`[CommandRunner] Error in "${cmd.name}":`, err);
    reply(ctx, {
      embeds: [embeds.error("An unexpected error occurred while running this command.")],
    }).catch(() => {});
  }
}

module.exports = { runCommand, reply };
