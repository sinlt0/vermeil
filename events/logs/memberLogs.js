// ============================================================
//  events/logs/memberLogs.js
//  Member join, leave, nickname change, role update, avatar
// ============================================================
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

module.exports = [

  {
    name: "guildMemberAdd",
    once: false,
    async execute(client, member) {
      const created = Math.floor(member.user.createdTimestamp / 1000);
      const embed   = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("👤 Member Joined")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User",       value: `${member.user.tag} (<@${member.id}>)`,                 inline: true },
          { name: "ID",         value: `\`${member.id}\``,                                     inline: true },
          { name: "Created",    value: `<t:${created}:R>`,                                     inline: true },
          { name: "Member #",   value: `\`${member.guild.memberCount}\``,                      inline: true },
        )
        .setFooter({ text: `Member Joined • ${member.guild.name}` })
        .setTimestamp();
      await sendLog(client, member.guild, "member", embed);
    },
  },

  {
    name: "guildMemberRemove",
    once: false,
    async execute(client, member) {
      const joined  = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime()/1000)}:R>` : "Unknown";
      const roles   = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => `<@&${r.id}>`)
        .join(", ") || "None";

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("👤 Member Left")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User",   value: `${member.user.tag} (<@${member.id}>)`, inline: true },
          { name: "ID",     value: `\`${member.id}\``,                     inline: true },
          { name: "Joined", value: joined,                                  inline: true },
          { name: "Roles",  value: roles.slice(0, 1024),                   inline: false },
        )
        .setFooter({ text: `Member Left • ${member.guild.name}` })
        .setTimestamp();
      await sendLog(client, member.guild, "member", embed);
    },
  },

  {
    name: "guildMemberUpdate",
    once: false,
    async execute(client, oldMember, newMember) {
      const guild = newMember.guild;

      // ── Nickname change ────────────────────────────────
      if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("✏️ Nickname Changed")
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "User",   value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: true },
            { name: "Before", value: oldMember.nickname ?? "*None*",               inline: true },
            { name: "After",  value: newMember.nickname ?? "*None*",               inline: true },
          )
          .setFooter({ text: `Member Updated • ${guild.name}` })
          .setTimestamp();
        await sendLog(client, guild, "member", embed);
      }

      // ── Role changes ───────────────────────────────────
      const addedRoles   = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== guild.id);
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== guild.id);

      if (addedRoles.size || removedRoles.size) {
        // Find executor from audit log
        let executor = null;
        try {
          await new Promise(r => setTimeout(r, 500));
          const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 3 });
          const entry = logs.entries.find(e => e.target?.id === newMember.id && Date.now() - e.createdTimestamp < 5000);
          executor = entry?.executor;
        } catch {}

        const embed = new EmbedBuilder()
          .setColor(0xFF9800)
          .setTitle("🎭 Roles Updated")
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "User",    value: `${newMember.user.tag} (<@${newMember.id}>)`,                                                                inline: true },
            { name: "By",      value: executor ? `${executor.tag}` : "Unknown",                                                                    inline: true },
            ...(addedRoles.size   ? [{ name: "➕ Added",   value: addedRoles.map(r => `<@&${r.id}>`).join(", ").slice(0,1024),   inline: false }] : []),
            ...(removedRoles.size ? [{ name: "➖ Removed", value: removedRoles.map(r => `<@&${r.id}>`).join(", ").slice(0,1024), inline: false }] : []),
          )
          .setFooter({ text: `Roles Updated • ${guild.name}` })
          .setTimestamp();
        await sendLog(client, guild, "member", embed);
      }

      // ── Avatar change ──────────────────────────────────
      if (oldMember.user.avatar !== newMember.user.avatar) {
        const embed = new EmbedBuilder()
          .setColor(0x00BCD4)
          .setTitle("🖼️ Avatar Changed")
          .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
          .addFields(
            { name: "User", value: `${newMember.user.tag} (<@${newMember.id}>)`, inline: true },
          )
          .setImage(newMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setFooter({ text: `Avatar Updated • ${guild.name}` })
          .setTimestamp();
        await sendLog(client, guild, "member", embed);
      }
    },
  },

];
