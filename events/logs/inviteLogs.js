// ============================================================
//  events/logs/inviteLogs.js
//  Invite create and delete
// ============================================================
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

module.exports = [

  {
    name: "inviteCreate",
    once: false,
    async execute(client, invite) {
      if (!invite.guild) return;
      const embed = new EmbedBuilder()
        .setColor(0x00BCD4)
        .setTitle("🔗 Invite Created")
        .addFields(
          { name: "Code",     value: `\`${invite.code}\``,                                                 inline: true },
          { name: "Channel",  value: invite.channel ? `<#${invite.channel.id}>` : "Unknown",              inline: true },
          { name: "Created By", value: invite.inviter ? `${invite.inviter.tag}` : "Unknown",              inline: true },
          { name: "Max Uses", value: invite.maxUses ? `\`${invite.maxUses}\`` : "Unlimited",               inline: true },
          { name: "Expires",  value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime()/1000)}:R>` : "Never", inline: true },
          { name: "URL",      value: invite.url,                                                           inline: false },
        )
        .setFooter({ text: `Invite Created • ${invite.guild.name}` })
        .setTimestamp();
      await sendLog(client, invite.guild, "invite", embed);
    },
  },

  {
    name: "inviteDelete",
    once: false,
    async execute(client, invite) {
      if (!invite.guild) return;
      let executor = null;
      try {
        await new Promise(r => setTimeout(r, 500));
        const logs  = await invite.guild.fetchAuditLogs({ type: AuditLogEvent.InviteDelete, limit: 3 });
        const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < 5000);
        executor    = entry?.executor;
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🔗 Invite Deleted")
        .addFields(
          { name: "Code",      value: `\`${invite.code}\``,                              inline: true },
          { name: "Channel",   value: invite.channel ? `<#${invite.channel.id}>` : "Unknown", inline: true },
          { name: "Deleted By",value: executor ? `${executor.tag}` : "Unknown",          inline: true },
        )
        .setFooter({ text: `Invite Deleted • ${invite.guild.name}` })
        .setTimestamp();
      await sendLog(client, invite.guild, "invite", embed);
    },
  },

];
