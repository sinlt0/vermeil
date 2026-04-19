// ============================================================
//  events/logs/modLogs.js
//  Ban, unban, timeout, kick — detected via audit log
//  Called directly from mod commands via sendLog
//  Also catches manual actions via guildAuditLogEntryCreate
// ============================================================
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

module.exports = {
  name: "guildAuditLogEntryCreate",
  once: false,
  async execute(client, auditEntry, guild) {
    if (!guild || !client.db) return;

    const { action, executor, target, reason } = auditEntry;
    if (!executor || executor.id === client.user.id) return; // skip bot's own actions

    const ts = `<t:${Math.floor(Date.now() / 1000)}:F>`;

    // ── BAN ───────────────────────────────────────────────
    if (action === AuditLogEvent.MemberBanAdd) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🔨 Member Banned")
        .setThumbnail(target?.displayAvatarURL?.({ dynamic: true }))
        .addFields(
          { name: "User",     value: target ? `${target.tag} (\`${target.id}\`)` : `\`${auditEntry.targetId}\``, inline: true },
          { name: "Moderator",value: `${executor.tag}`,                                                           inline: true },
          { name: "Reason",   value: reason ?? "No reason provided",                                              inline: false },
          { name: "Time",     value: ts,                                                                          inline: true },
        )
        .setFooter({ text: `Mod Action • ${guild.name}` })
        .setTimestamp();
      await sendLog(client, guild, "mod", embed);
    }

    // ── UNBAN ─────────────────────────────────────────────
    if (action === AuditLogEvent.MemberBanRemove) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🔓 Member Unbanned")
        .addFields(
          { name: "User",     value: target ? `${target.tag} (\`${target.id}\`)` : `\`${auditEntry.targetId}\``, inline: true },
          { name: "Moderator",value: `${executor.tag}`,                                                           inline: true },
          { name: "Reason",   value: reason ?? "No reason provided",                                              inline: false },
        )
        .setFooter({ text: `Mod Action • ${guild.name}` })
        .setTimestamp();
      await sendLog(client, guild, "mod", embed);
    }

    // ── KICK ──────────────────────────────────────────────
    if (action === AuditLogEvent.MemberKick) {
      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle("👢 Member Kicked")
        .setThumbnail(target?.displayAvatarURL?.({ dynamic: true }))
        .addFields(
          { name: "User",     value: target ? `${target.tag} (\`${target.id}\`)` : `\`${auditEntry.targetId}\``, inline: true },
          { name: "Moderator",value: `${executor.tag}`,                                                           inline: true },
          { name: "Reason",   value: reason ?? "No reason provided",                                              inline: false },
        )
        .setFooter({ text: `Mod Action • ${guild.name}` })
        .setTimestamp();
      await sendLog(client, guild, "mod", embed);
    }

    // ── TIMEOUT ───────────────────────────────────────────
    if (action === AuditLogEvent.MemberUpdate) {
      const changes   = auditEntry.changes ?? [];
      const toChange  = changes.find(c => c.key === "communication_disabled_until");
      if (!toChange) return;

      const isTimeout = !!toChange.newValue;
      const embed     = new EmbedBuilder()
        .setColor(isTimeout ? 0x9C27B0 : 0x57F287)
        .setTitle(isTimeout ? "🔇 Member Timed Out" : "🔊 Timeout Removed")
        .setThumbnail(target?.displayAvatarURL?.({ dynamic: true }))
        .addFields(
          { name: "User",     value: target ? `${target.tag} (\`${target.id}\`)` : `\`${auditEntry.targetId}\``, inline: true },
          { name: "Moderator",value: `${executor.tag}`,                                                           inline: true },
          ...(isTimeout ? [{ name: "Expires", value: `<t:${Math.floor(new Date(toChange.newValue).getTime()/1000)}:R>`, inline: true }] : []),
          { name: "Reason",   value: reason ?? "No reason provided",                                              inline: false },
        )
        .setFooter({ text: `Mod Action • ${guild.name}` })
        .setTimestamp();
      await sendLog(client, guild, "mod", embed);
    }
  },
};
