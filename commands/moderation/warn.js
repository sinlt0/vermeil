// ============================================================
//  commands/moderation/warn.js
//  Warn a member — auto-applies threshold action if configured
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }   = require("../../utils/commandRunner");
const embeds      = require("../../utils/embeds");
const {
  createCase, sendModLog,
  applyThreshold, scheduleTempBan, formatDuration,
} = require("../../utils/modUtils");

module.exports = {
  name:             "warn",
  description:      "Warn a member.",
  category:         "moderation",
  aliases:          [],
  usage:            "<@user> [reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("The member to warn.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the warning.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Timeout Members** permission.")] });
    }

    let target, reason;
    if (ctx.type === "prefix") {
      target = ctx.message.mentions.members.first();
      if (!target) return reply(ctx, { embeds: [embeds.error("Please mention a member.")] });
      reason = ctx.args.slice(1).join(" ") || "No reason provided.";
    } else {
      target = ctx.interaction.options.getMember("user");
      reason = ctx.interaction.options.getString("reason") || "No reason provided.";
    }

    if (!target) return reply(ctx, { embeds: [embeds.error("Member not found.")] });
    if (target.id === mod.id) return reply(ctx, { embeds: [embeds.error("You cannot warn yourself.")] });
    if (target.user.bot) return reply(ctx, { embeds: [embeds.error("You cannot warn a bot.")] });
    if (target.roles.highest.position >= mod.roles.highest.position) {
      return reply(ctx, { embeds: [embeds.error("You cannot warn someone with an equal or higher role.")] });
    }

    // ── Create warn case ───────────────────────────────
    const modCase = await createCase(client, guild.id, {
      action:       "warn",
      targetId:     target.id,
      targetTag:    target.user.tag,
      moderatorId:  mod.id,
      moderatorTag: mod.user.tag,
      reason,
    });

    await sendModLog(client, guild, modCase);

    // Count total warnings for this user in this guild
    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: ModCase } = require("../../models/ModCase");
    const ModCaseModel = ModCase(guildDb.connection);
    const warnCount = await ModCaseModel.countDocuments({
      guildId:  guild.id,
      targetId: target.id,
      action:   "warn",
    });

    // DM the warned user
    await target.user.send({
      embeds: [embeds.warning(
        `You have received a warning in **${guild.name}**.\n**Reason:** ${reason}\n**Total Warnings:** ${warnCount}`,
        "⚠️ Warning Received"
      )],
    }).catch(() => {});

    // Check threshold
    const threshold = await applyThreshold(client, guild, target, warnCount);
    let thresholdMsg = "";

    if (threshold) {
      thresholdMsg = await executeThresholdAction(client, guild, target, mod, threshold, warnCount);
    }

    return reply(ctx, {
      embeds: [embeds.warning(
        `**${target.user.tag}** has been warned.\n**Reason:** ${reason}\n**Total Warnings:** ${warnCount}\n**Case:** #${modCase?.caseNumber ?? "N/A"}` +
        (thresholdMsg ? `\n\n${thresholdMsg}` : ""),
        "⚠️ Member Warned"
      )],
    });
  },
};

async function executeThresholdAction(client, guild, target, mod, threshold, warnCount) {
  const {
    scheduleTempBan,
    createCase,
    sendModLog,
    formatDuration,
  } = require("../../utils/modUtils");

  const reason = `Automatic action: reached ${warnCount} warnings.`;

  try {
    if (threshold.action === "kick") {
      await target.user.send({ embeds: [embeds.warning(`You have been **kicked** from **${guild.name}** for reaching ${warnCount} warnings.`, "👢 Auto-Kick")] }).catch(() => {});
      await target.kick(reason);
      const c = await createCase(client, guild.id, { action: "kick", targetId: target.id, targetTag: target.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason });
      await sendModLog(client, guild, c);
      return `⚠️ Threshold action applied: **Kick** (${warnCount} warnings)`;
    }

    if (threshold.action === "timeout" && threshold.duration) {
      await target.timeout(threshold.duration, reason);
      const c = await createCase(client, guild.id, { action: "timeout", targetId: target.id, targetTag: target.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason, duration: threshold.duration });
      await sendModLog(client, guild, c);
      return `⚠️ Threshold action applied: **Timeout** for ${formatDuration(threshold.duration)} (${warnCount} warnings)`;
    }

    if (threshold.action === "tempban" && threshold.duration) {
      const expiresAt = new Date(Date.now() + threshold.duration);
      await target.user.send({ embeds: [embeds.error(`You have been temporarily banned from **${guild.name}** for ${formatDuration(threshold.duration)} for reaching ${warnCount} warnings.`, "🔨 Auto-TempBan")] }).catch(() => {});
      await guild.members.ban(target.id, { reason });
      const c = await createCase(client, guild.id, { action: "tempban", targetId: target.id, targetTag: target.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason, duration: threshold.duration, expiresAt });
      await scheduleTempBan(client, guild, target.id, target.user.tag, expiresAt, c?.caseNumber);
      await sendModLog(client, guild, c);
      return `⚠️ Threshold action applied: **TempBan** for ${formatDuration(threshold.duration)} (${warnCount} warnings)`;
    }

    if (threshold.action === "ban") {
      await target.user.send({ embeds: [embeds.error(`You have been **permanently banned** from **${guild.name}** for reaching ${warnCount} warnings.`, "🔨 Auto-Ban")] }).catch(() => {});
      await guild.members.ban(target.id, { reason });
      const c = await createCase(client, guild.id, { action: "ban", targetId: target.id, targetTag: target.user.tag, moderatorId: client.user.id, moderatorTag: client.user.tag, reason });
      await sendModLog(client, guild, c);
      return `⚠️ Threshold action applied: **Permanent Ban** (${warnCount} warnings)`;
    }
  } catch (e) {
    return `⚠️ Threshold action failed: ${e.message}`;
  }

  return "";
}
