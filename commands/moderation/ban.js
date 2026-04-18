// ============================================================
//  commands/moderation/ban.js
//  Supports permanent ban and tempban with auto-unban
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }   = require("../../utils/commandRunner");
const embeds      = require("../../utils/embeds");
const {
  createCase, sendModLog,
  scheduleTempBan, parseDuration, formatDuration,
} = require("../../utils/modUtils");

module.exports = {
  name:             "ban",
  description:      "Ban a user from the server. Use --temp <duration> for a temporary ban.",
  category:         "moderation",
  aliases:          ["banish"],
  usage:            "<@user|id> [--temp <duration>] [reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName("user").setDescription("The user to ban.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the ban.").setRequired(false))
    .addStringOption((o) => o.setName("duration").setDescription("Temp ban duration e.g. 7d, 24h. Leave empty for permanent.").setRequired(false))
    .addIntegerOption((o) => o.setName("delete_days").setDescription("Days of messages to delete (0-7).").setMinValue(0).setMaxValue(7).setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.BanMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Ban Members** permission.")] });
    }

    let targetUser, targetMember, reason, duration, deleteMessageDays;

    if (ctx.type === "prefix") {
      const mention = ctx.message.mentions.users.first();
      const idArg   = !mention ? ctx.args[0] : null;
      targetUser    = mention || await client.users.fetch(idArg).catch(() => null);
      if (!targetUser) return reply(ctx, { embeds: [embeds.error("User not found. Provide a mention or valid user ID.")] });

      targetMember = guild.members.cache.get(targetUser.id);
      const argStr = ctx.args.slice(mention ? 1 : 1).join(" ");

      // Parse --temp flag
      const tempMatch = argStr.match(/--temp\s+(\S+)/i);
      duration     = tempMatch ? parseDuration(tempMatch[1]) : null;
      reason       = argStr.replace(/--temp\s+\S+/i, "").trim() || "No reason provided.";
      deleteMessageDays = 0;
    } else {
      targetUser        = ctx.interaction.options.getUser("user");
      targetMember      = ctx.interaction.options.getMember("user");
      reason            = ctx.interaction.options.getString("reason") || "No reason provided.";
      const durStr      = ctx.interaction.options.getString("duration");
      duration          = durStr ? parseDuration(durStr) : null;
      deleteMessageDays = ctx.interaction.options.getInteger("delete_days") ?? 0;
    }

    if (targetUser.id === mod.id) return reply(ctx, { embeds: [embeds.error("You cannot ban yourself.")] });
    if (targetMember) {
      if (!targetMember.bannable) return reply(ctx, { embeds: [embeds.error("I cannot ban this member.")] });
      if (targetMember.roles.highest.position >= mod.roles.highest.position) {
        return reply(ctx, { embeds: [embeds.error("You cannot ban someone with an equal or higher role.")] });
      }
    }

    const isTempBan   = !!duration;
    const action      = isTempBan ? "tempban" : "ban";
    const expiresAt   = isTempBan ? new Date(Date.now() + duration) : null;
    const durationStr = isTempBan ? formatDuration(duration) : "Permanent";

    // DM target before ban
    await targetUser.send({
      embeds: [embeds.error(
        `You have been **${isTempBan ? `temporarily banned for ${durationStr}` : "permanently banned"}** from **${guild.name}**.\n**Reason:** ${reason}`,
        "🔨 You were banned"
      )],
    }).catch(() => {});

    await guild.members.ban(targetUser.id, { reason, deleteMessageDays });

    const modCase = await createCase(client, guild.id, {
      action,
      targetId:     targetUser.id,
      targetTag:    targetUser.tag,
      moderatorId:  mod.id,
      moderatorTag: mod.user.tag,
      reason,
      duration:     duration ?? null,
      expiresAt,
    });

    if (isTempBan && expiresAt) {
      await scheduleTempBan(client, guild, targetUser.id, targetUser.tag, expiresAt, modCase?.caseNumber);
    }

    await sendModLog(client, guild, modCase);

    return reply(ctx, {
      embeds: [embeds.success(
        `**${targetUser.tag}** has been ${isTempBan ? `temporarily banned for **${durationStr}**` : "permanently banned"}.\n` +
        `**Reason:** ${reason}\n**Case:** #${modCase?.caseNumber ?? "N/A"}`,
        "🔨 User Banned"
      )],
    });
  },
};
