// ============================================================
//  commands/moderation/purge.js
//  Bulk delete messages with filters
//  Filters: user, bots, keyword, embeds, attachments
//  Skips messages older than 14 days (Discord limit)
//  Rate-limit safe: batches of 100 with delays
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");

const MAX_PURGE      = 1000;
const BATCH_SIZE     = 100;
const BATCH_DELAY_MS = 1200; // stay well under rate limits
const MAX_AGE_MS     = 14 * 24 * 60 * 60 * 1000;

module.exports = {
  name:             "purge",
  description:      "Bulk delete messages with optional filters.",
  category:         "moderation",
  aliases:          ["clear", "prune"],
  usage:            "<amount> [--user @user] [--bots] [--keyword <word>] [--embeds] [--attachments]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Bulk delete messages with optional filters.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) => o.setName("amount").setDescription(`Number of messages to delete (max ${MAX_PURGE}).`).setRequired(true).setMinValue(1).setMaxValue(MAX_PURGE))
    .addUserOption((o) => o.setName("user").setDescription("Only delete messages from this user.").setRequired(false))
    .addBooleanOption((o) => o.setName("bots").setDescription("Only delete bot messages.").setRequired(false))
    .addStringOption((o) => o.setName("keyword").setDescription("Only delete messages containing this keyword.").setRequired(false))
    .addBooleanOption((o) => o.setName("embeds").setDescription("Only delete messages with embeds.").setRequired(false))
    .addBooleanOption((o) => o.setName("attachments").setDescription("Only delete messages with attachments.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const mod     = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Messages** permission.")] });
    }

    // ── Parse args ─────────────────────────────────────
    let amount, filterUser, filterBots, filterKeyword, filterEmbeds, filterAttachments;

    if (ctx.type === "prefix") {
      amount          = parseInt(ctx.args[0]);
      const argStr    = ctx.args.join(" ");
      filterBots       = /--bots/i.test(argStr);
      filterEmbeds     = /--embeds/i.test(argStr);
      filterAttachments= /--attachments/i.test(argStr);
      const userMatch  = argStr.match(/--user\s+<@!?(\d+)>/i);
      filterUser       = userMatch ? userMatch[1] : null;
      const kwMatch    = argStr.match(/--keyword\s+"?([^"]+)"?/i);
      filterKeyword    = kwMatch ? kwMatch[1].toLowerCase() : null;
    } else {
      amount           = ctx.interaction.options.getInteger("amount");
      filterUser       = ctx.interaction.options.getUser("user")?.id ?? null;
      filterBots       = ctx.interaction.options.getBoolean("bots") ?? false;
      filterKeyword    = ctx.interaction.options.getString("keyword")?.toLowerCase() ?? null;
      filterEmbeds     = ctx.interaction.options.getBoolean("embeds") ?? false;
      filterAttachments= ctx.interaction.options.getBoolean("attachments") ?? false;
    }

    if (!amount || amount < 1) {
      return reply(ctx, { embeds: [embeds.error("Please provide a valid amount.")] });
    }

    amount = Math.min(amount, MAX_PURGE);

    // Delete the command message for prefix
    if (ctx.type === "prefix") await ctx.message.delete().catch(() => {});

    let totalDeleted = 0;
    let totalSkipped = 0;
    let lastMessageId = null;

    // ── Batch loop ─────────────────────────────────────
    while (totalDeleted + totalSkipped < amount) {
      const toFetch = Math.min(BATCH_SIZE, amount - totalDeleted - totalSkipped);

      const fetchOptions = { limit: toFetch };
      if (lastMessageId) fetchOptions.before = lastMessageId;

      const fetched = await channel.messages.fetch(fetchOptions);
      if (fetched.size === 0) break;

      lastMessageId = fetched.last()?.id;

      const now = Date.now();

      // Filter: skip messages older than 14 days
      const eligible = fetched.filter((msg) => {
        if (now - msg.createdTimestamp > MAX_AGE_MS) {
          totalSkipped++;
          return false;
        }
        if (filterUser       && msg.author.id !== filterUser)     return false;
        if (filterBots       && !msg.author.bot)                  return false;
        if (filterKeyword    && !msg.content.toLowerCase().includes(filterKeyword)) return false;
        if (filterEmbeds     && msg.embeds.length === 0)          return false;
        if (filterAttachments&& msg.attachments.size === 0)       return false;
        return true;
      });

      if (eligible.size === 0) {
        if (fetched.size < toFetch) break; // no more messages
        continue;
      }

      const deleted = await channel.bulkDelete(eligible, true).catch(() => new Map());
      totalDeleted += deleted.size;

      if (fetched.size < toFetch) break;

      // Delay between batches to avoid rate limits
      if (totalDeleted + totalSkipped < amount) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // ── Result embed ───────────────────────────────────
    const lines = [`**Deleted:** \`${totalDeleted}\` messages`];
    if (totalSkipped > 0) lines.push(`**Skipped:** \`${totalSkipped}\` messages (older than 14 days)`);
    if (filterUser)        lines.push(`**Filter:** User <@${filterUser}>`);
    if (filterBots)        lines.push(`**Filter:** Bots only`);
    if (filterKeyword)     lines.push(`**Filter:** Keyword \`${filterKeyword}\``);
    if (filterEmbeds)      lines.push(`**Filter:** Embeds only`);
    if (filterAttachments) lines.push(`**Filter:** Attachments only`);

    const resultEmbed = embeds.success(lines.join("\n"), "🗑️ Purge Complete");

    const sent = await channel.send({ embeds: [resultEmbed] });
    setTimeout(() => sent.delete().catch(() => {}), 5000);
  },
};
