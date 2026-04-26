// ============================================================
//  commands/antinuke/aninfo.js
//  !aninfo           — full antinuke status overview
//  !aninfo @user     — check user's permit + whitelist status
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { getConfig, isImmune } = require("../../utils/antiNukeUtils");
const e = require("../../emojis/antinukeemoji");

module.exports = {
  name: "aninfo", description: "View antinuke status.", category: "antinuke",
  aliases: ["anstatus", "antinukeinfo"], usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    const config  = await getConfig(client, guild.id);

    const { fromConnection: AntiNukePermit }    = require("../../models/AntiNukePermit");
    const { fromConnection: AntiNukeWhitelist } = require("../../models/AntiNukeWhitelist");
    const { fromConnection: QuarantineEntry }   = require("../../models/QuarantineEntry");
    const { fromConnection: AntiNukeLog }       = require("../../models/AntiNukeLog");

    const targetUser = message.mentions.users.first();

    // ── USER info ─────────────────────────────────────────
    if (targetUser) {
      const immunity  = await isImmune(client, guild, targetUser.id);
      const permit    = await AntiNukePermit(guildDb.connection).findOne({ guildId: guild.id, userId: targetUser.id }).lean();
      const wlEntry   = await AntiNukeWhitelist(guildDb.connection).findOne({ guildId: guild.id, targetId: targetUser.id }).lean();
      const qEntry    = await QuarantineEntry(guildDb.connection).findOne({ guildId: guild.id, userId: targetUser.id }).lean();

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
        .setTitle(`${e.info} User Info — Antinuke`)
        .addFields(
          { name: `${e.immune} Immunity`,
            value: immunity.immune ? `✅ Immune (**${immunity.level}**)` : "❌ Not immune",
            inline: true },
          { name: `${e.trustedAdmin} Permit`,
            value: permit
              ? (permit.level === "extra_owner" ? `${e.extraOwner} Extra Owner` : `${e.trustedAdmin} Trusted Admin`)
              : "None",
            inline: true },
          { name: `${e.quarantine} Quarantined`,
            value: qEntry ? `✅ Yes\nReason: ${qEntry.reason}` : "❌ No",
            inline: true },
          { name: `${e.whitelist} Whitelisted`,
            value: wlEntry ? `✅ Yes\nTypes: ${wlEntry.types.join(", ")}` : "❌ No",
            inline: true },
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── SERVER overview ───────────────────────────────────
    if (!config) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${e.error} Antinuke has not been set up yet. Run \`!setup\` to get started.`)] });
    }

    const permits      = await AntiNukePermit(guildDb.connection).find({ guildId: guild.id }).lean();
    const wlEntries    = await AntiNukeWhitelist(guildDb.connection).find({ guildId: guild.id }).lean();
    const qEntries     = await QuarantineEntry(guildDb.connection).find({ guildId: guild.id }).lean();
    const recentLogs   = await AntiNukeLog(guildDb.connection).find({ guildId: guild.id }).sort({ createdAt: -1 }).limit(5).lean();

    const extraOwners   = permits.filter(p => p.level === "extra_owner");
    const trustedAdmins = permits.filter(p => p.level === "trusted_admin");

    const filterStatus = (key) => config.filters[key]?.enabled ? e.on : e.off;

    const filtersField = [
      `${filterStatus("massChannel")} Mass Channel`,
      `${filterStatus("massRole")} Mass Role`,
      `${filterStatus("pruneProtection")} Prune Protection`,
      `${filterStatus("quarantineHold")} Quarantine Hold`,
      `${filterStatus("massBanKick")} Mass Ban/Kick`,
      `${filterStatus("strictMode")} Strict Mode`,
      `${filterStatus("monitorPublicRoles")} Public Roles`,
      `${filterStatus("massWebhook")} Mass Webhook`,
      `${filterStatus("massEmoji")} Mass Emoji`,
    ].join("\n");

    const recentLogLines = recentLogs.map(l =>
      `\`${l.action}\` — <t:${Math.floor(new Date(l.createdAt).getTime() / 1000)}:R>`
    ).join("\n") || "No recent actions";

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.shield} Antinuke Overview — ${guild.name}`)
      .addFields(
        { name: `${config.enabled ? e.on : e.off} Status`,
          value: config.enabled ? "**Enabled**" : "**Disabled**",
          inline: true },
        { name: `${config.panicMode?.active ? e.panicOn : e.shieldOn} Panic Mode`,
          value: config.panicMode?.active ? "**ACTIVE** 🆘" : "Inactive",
          inline: true },
        { name: `${e.check} Setup`,
          value: config.setupCompleted ? "✅ Complete" : "⚠️ Incomplete — run `!setup`",
          inline: true },
        { name: `${e.extraOwner} Extra Owners`,
          value: extraOwners.length ? extraOwners.map(p => `<@${p.userId}>`).join(", ") : "None",
          inline: true },
        { name: `${e.trustedAdmin} Trusted Admins`,
          value: trustedAdmins.length ? trustedAdmins.map(p => `<@${p.userId}>`).join(", ") : "None",
          inline: true },
        { name: `${e.quarantine} Quarantine Role`,
          value: config.quarantineRoleId ? `<@&${config.quarantineRoleId}>` : "❌ Not set",
          inline: true },
        { name: `${e.logChannel} Log Channel`,
          value: config.logChannelId ? `<#${config.logChannelId}>` : "❌ Not set",
          inline: true },
        { name: `${e.whitelist} Whitelisted`,
          value: `${wlEntries.length} entries`,
          inline: true },
        { name: `${e.quarantine} Quarantined`,
          value: `${qEntries.length} members`,
          inline: true },
        { name: `${e.shield} Filters`,
          value: filtersField,
          inline: true },
        { name: `${e.log} Recent Actions`,
          value: recentLogLines,
          inline: false },
      )
      .setFooter({ text: `Run !aninfo @user to check a specific user` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};

async function canManage(client, guild, userId) {
  if (guild.ownerId === userId) return true;
  if (userId === client.config.ownerID) return true;
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb) return false;
  const { fromConnection: AntiNukePermit } = require("../../models/AntiNukePermit");
  const permit = await AntiNukePermit(guildDb.connection).findOne({ guildId: guild.id, userId }).lean();
  return !!permit;
}
