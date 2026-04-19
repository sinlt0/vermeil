// ============================================================
//  events/logs/messageLogs.js
//  Message delete, edit, bulk delete
// ============================================================
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

module.exports = [

  {
    name: "messageDelete",
    once: false,
    async execute(client, message) {
      if (!message.guild) return;
      if (message.author?.bot) return;

      // Find executor from audit log
      let executor = null;
      try {
        await new Promise(r => setTimeout(r, 500));
        const logs  = await message.guild.fetchAuditLogs({ type: AuditLogEvent.MessageDelete, limit: 3 });
        const entry = logs.entries.find(e =>
          e.target?.id === message.author?.id &&
          Date.now() - e.createdTimestamp < 5000
        );
        executor = entry?.executor;
      } catch {}

      const content = message.content
        ? message.content.slice(0, 1000)
        : "*No text content*";

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🗑️ Message Deleted")
        .addFields(
          { name: "Author",  value: message.author ? `${message.author.tag} (<@${message.author.id}>)` : "Unknown", inline: true },
          { name: "Channel", value: `<#${message.channelId}>`,                                                       inline: true },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown / Self",                             inline: true },
          { name: "Content", value: content,                                                                         inline: false },
          ...(message.attachments.size ? [{
            name:  "Attachments",
            value: message.attachments.map(a => a.url).join("\n").slice(0, 1024),
            inline: false,
          }] : []),
        )
        .setFooter({ text: `Message Deleted • ${message.guild.name}` })
        .setTimestamp();

      await sendLog(client, message.guild, "message", embed);
    },
  },

  {
    name: "messageUpdate",
    once: false,
    async execute(client, oldMessage, newMessage) {
      if (!newMessage.guild) return;
      if (newMessage.author?.bot) return;
      if (oldMessage.content === newMessage.content) return;

      const before = oldMessage.content?.slice(0, 1000) || "*Unknown (not cached)*";
      const after  = newMessage.content?.slice(0, 1000) || "*Empty*";

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("✏️ Message Edited")
        .addFields(
          { name: "Author",  value: `${newMessage.author.tag} (<@${newMessage.author.id}>)`,                  inline: true },
          { name: "Channel", value: `<#${newMessage.channelId}>`,                                             inline: true },
          { name: "Jump",    value: `[Click to view](${newMessage.url})`,                                     inline: true },
          { name: "Before",  value: before,                                                                   inline: false },
          { name: "After",   value: after,                                                                    inline: false },
        )
        .setFooter({ text: `Message Edited • ${newMessage.guild.name}` })
        .setTimestamp();

      await sendLog(client, newMessage.guild, "message", embed);
    },
  },

  {
    name: "messageDeleteBulk",
    once: false,
    async execute(client, messages, channel) {
      if (!channel.guild) return;

      // Find executor
      let executor = null;
      try {
        await new Promise(r => setTimeout(r, 500));
        const logs  = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.MessageBulkDelete, limit: 3 });
        const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < 5000);
        executor    = entry?.executor;
      } catch {}

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🗑️ Bulk Delete (Purge)")
        .addFields(
          { name: "Channel",  value: `<#${channel.id}>`,                         inline: true },
          { name: "Count",    value: `\`${messages.size}\` messages`,            inline: true },
          { name: "Purged By",value: executor ? `${executor.tag}` : "Unknown",   inline: true },
        )
        .setFooter({ text: `Bulk Delete • ${channel.guild.name}` })
        .setTimestamp();

      await sendLog(client, channel.guild, "message", embed);
    },
  },

];
