// ============================================================
//  commands/moderation/timeout.js
//  Timeout (mute) or untimeout a member
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }   = require("../../utils/commandRunner");
const embeds      = require("../../utils/embeds");
const { createCase, sendModLog, parseDuration, formatDuration } = require("../../utils/modUtils");

// Discord max timeout: 28 days
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

module.exports = {
  name:             "timeout",
  description:      "Timeout a member. Use 'remove' as duration to untimeout.",
  category:         "moderation",
  aliases:          ["mute", "silence"],
  usage:            "<@user> <duration|remove> [reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout or untimeout a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("The member to timeout.").setRequired(true))
    .addStringOption((o) => o.setName("duration").setDescription('Duration e.g. 10m, 1h, 7d — or "remove" to untimeout.').setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Timeout Members** permission.")] });
    }

    let target, durStr, reason;
    if (ctx.type === "prefix") {
      target = ctx.message.mentions.members.first();
      if (!target) return reply(ctx, { embeds: [embeds.error("Please mention a member.")] });
      durStr = ctx.args[1];
      reason = ctx.args.slice(2).join(" ") || "No reason provided.";
    } else {
      target = ctx.interaction.options.getMember("user");
      durStr = ctx.interaction.options.getString("duration");
      reason = ctx.interaction.options.getString("reason") || "No reason provided.";
    }

    if (!target) return reply(ctx, { embeds: [embeds.error("Member not found.")] });
    if (target.id === mod.id) return reply(ctx, { embeds: [embeds.error("You cannot timeout yourself.")] });
    if (!target.moderatable) return reply(ctx, { embeds: [embeds.error("I cannot timeout this member.")] });
    if (target.roles.highest.position >= mod.roles.highest.position) {
      return reply(ctx, { embeds: [embeds.error("You cannot timeout someone with an equal or higher role.")] });
    }

    const isRemove = durStr?.toLowerCase() === "remove";

    if (isRemove) {
      await target.timeout(null, reason);

      const modCase = await createCase(client, guild.id, {
        action:       "untimeout",
        targetId:     target.id,
        targetTag:    target.user.tag,
        moderatorId:  mod.id,
        moderatorTag: mod.user.tag,
        reason,
      });

      await sendModLog(client, guild, modCase);

      return reply(ctx, {
        embeds: [embeds.success(
          `**${target.user.tag}**'s timeout has been removed.\n**Reason:** ${reason}\n**Case:** #${modCase?.caseNumber ?? "N/A"}`,
          "🔊 Timeout Removed"
        )],
      });
    }

    const duration = parseDuration(durStr);
    if (!duration) return reply(ctx, { embeds: [embeds.error('Invalid duration. Examples: `10m`, `1h`, `7d`, or `remove`.')] });
    if (duration > MAX_TIMEOUT_MS) return reply(ctx, { embeds: [embeds.error("Timeout cannot exceed **28 days**.")] });

    await target.timeout(duration, reason);

    await target.user.send({
      embeds: [embeds.warning(
        `You have been **timed out** in **${guild.name}** for **${formatDuration(duration)}**.\n**Reason:** ${reason}`,
        "🔇 You were timed out"
      )],
    }).catch(() => {});

    const modCase = await createCase(client, guild.id, {
      action:       "timeout",
      targetId:     target.id,
      targetTag:    target.user.tag,
      moderatorId:  mod.id,
      moderatorTag: mod.user.tag,
      reason,
      duration,
      expiresAt:    new Date(Date.now() + duration),
    });

    await sendModLog(client, guild, modCase);

    return reply(ctx, {
      embeds: [embeds.success(
        `**${target.user.tag}** has been timed out for **${formatDuration(duration)}**.\n**Reason:** ${reason}\n**Case:** #${modCase?.caseNumber ?? "N/A"}`,
        "🔇 Member Timed Out"
      )],
    });
  },
};
