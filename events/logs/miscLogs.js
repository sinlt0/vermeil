// ============================================================
//  events/logs/miscLogs.js
//  Thread, Webhook, Emoji/Sticker, Boost logs
// ============================================================
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

async function getExecutor(guild, type) {
  try {
    await new Promise(r => setTimeout(r, 500));
    const logs  = await guild.fetchAuditLogs({ type, limit: 3 });
    const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < 5000);
    return entry?.executor ?? null;
  } catch { return null; }
}

module.exports = [

  // ── THREAD LOGS ───────────────────────────────────────
  {
    name: "threadCreate",
    once: false,
    async execute(client, thread) {
      if (!thread.guild) return;
      const embed = new EmbedBuilder()
        .setColor(0xFF6B9D)
        .setTitle("🧵 Thread Created")
        .addFields(
          { name: "Thread",  value: `${thread} (\`${thread.name}\`)`,                                            inline: true },
          { name: "Parent",  value: thread.parent ? `<#${thread.parentId}>` : "Unknown",                        inline: true },
          { name: "Owner",   value: thread.ownerId ? `<@${thread.ownerId}>` : "Unknown",                        inline: true },
        )
        .setFooter({ text: `Thread Created • ${thread.guild.name}` })
        .setTimestamp();
      await sendLog(client, thread.guild, "thread", embed);
    },
  },

  {
    name: "threadDelete",
    once: false,
    async execute(client, thread) {
      if (!thread.guild) return;
      const executor = await getExecutor(thread.guild, AuditLogEvent.ThreadDelete);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🧵 Thread Deleted")
        .addFields(
          { name: "Name",       value: `\`${thread.name}\``,                                inline: true },
          { name: "Parent",     value: thread.parent ? `<#${thread.parentId}>` : "Unknown", inline: true },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown",            inline: true },
        )
        .setFooter({ text: `Thread Deleted • ${thread.guild.name}` })
        .setTimestamp();
      await sendLog(client, thread.guild, "thread", embed);
    },
  },

  {
    name: "threadUpdate",
    once: false,
    async execute(client, oldThread, newThread) {
      if (!newThread.guild) return;
      const changes = [];
      if (oldThread.name     !== newThread.name)     changes.push({ name: "Name",   before: oldThread.name, after: newThread.name });
      if (oldThread.archived !== newThread.archived) changes.push({ name: "Archived", before: `${oldThread.archived}`, after: `${newThread.archived}` });
      if (oldThread.locked   !== newThread.locked)   changes.push({ name: "Locked",   before: `${oldThread.locked}`,   after: `${newThread.locked}` });
      if (!changes.length) return;

      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle("🧵 Thread Updated")
        .addFields(
          { name: "Thread", value: `${newThread}`, inline: true },
          ...changes.map(c => ({ name: c.name, value: `**Before:** ${c.before}\n**After:** ${c.after}`, inline: false })),
        )
        .setFooter({ text: `Thread Updated • ${newThread.guild.name}` })
        .setTimestamp();
      await sendLog(client, newThread.guild, "thread", embed);
    },
  },

  // ── WEBHOOK LOGS ──────────────────────────────────────
  {
    name: "webhookCreate",
    once: false,
    async execute(client, webhook) {
      if (!webhook.guild) return;
      const embed = new EmbedBuilder()
        .setColor(0x607D8B)
        .setTitle("🪝 Webhook Created")
        .addFields(
          { name: "Name",    value: `\`${webhook.name}\``,                                               inline: true },
          { name: "Channel", value: webhook.channelId ? `<#${webhook.channelId}>` : "Unknown",          inline: true },
          { name: "Owner",   value: webhook.owner ? `${webhook.owner.tag}` : "Unknown",                 inline: true },
        )
        .setFooter({ text: `Webhook Created • ${webhook.guild.name}` })
        .setTimestamp();
      await sendLog(client, webhook.guild, "webhook", embed);
    },
  },

  {
    name: "webhookDelete",
    once: false,
    async execute(client, webhook) {
      if (!webhook.guild) return;
      const executor = await getExecutor(webhook.guild, AuditLogEvent.WebhookDelete);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🪝 Webhook Deleted")
        .addFields(
          { name: "Name",       value: `\`${webhook.name}\``,                               inline: true },
          { name: "Channel",    value: webhook.channelId ? `<#${webhook.channelId}>` : "Unknown", inline: true },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown",           inline: true },
        )
        .setFooter({ text: `Webhook Deleted • ${webhook.guild.name}` })
        .setTimestamp();
      await sendLog(client, webhook.guild, "webhook", embed);
    },
  },

  // ── EMOJI / STICKER LOGS ──────────────────────────────
  {
    name: "emojiCreate",
    once: false,
    async execute(client, emoji) {
      const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiCreate);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle("😀 Emoji Created")
        .setThumbnail(emoji.imageURL())
        .addFields(
          { name: "Name",       value: `\`:${emoji.name}:\``,                              inline: true },
          { name: "Animated",   value: emoji.animated ? "Yes" : "No",                      inline: true },
          { name: "Created By", value: executor ? `${executor.tag}` : "Unknown",          inline: true },
        )
        .setFooter({ text: `Emoji Created • ${emoji.guild.name}` })
        .setTimestamp();
      await sendLog(client, emoji.guild, "emoji", embed);
    },
  },

  {
    name: "emojiDelete",
    once: false,
    async execute(client, emoji) {
      const executor = await getExecutor(emoji.guild, AuditLogEvent.EmojiDelete);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("😀 Emoji Deleted")
        .addFields(
          { name: "Name",       value: `\`:${emoji.name}:\``,                              inline: true },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown",          inline: true },
        )
        .setFooter({ text: `Emoji Deleted • ${emoji.guild.name}` })
        .setTimestamp();
      await sendLog(client, emoji.guild, "emoji", embed);
    },
  },

  {
    name: "emojiUpdate",
    once: false,
    async execute(client, oldEmoji, newEmoji) {
      if (oldEmoji.name === newEmoji.name) return;
      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle("😀 Emoji Updated")
        .setThumbnail(newEmoji.imageURL())
        .addFields(
          { name: "Before", value: `\`:${oldEmoji.name}:\``, inline: true },
          { name: "After",  value: `\`:${newEmoji.name}:\``, inline: true },
        )
        .setFooter({ text: `Emoji Updated • ${newEmoji.guild.name}` })
        .setTimestamp();
      await sendLog(client, newEmoji.guild, "emoji", embed);
    },
  },

  // ── BOOST LOGS ────────────────────────────────────────
  {
    name: "guildMemberUpdate",
    once: false,
    async execute(client, oldMember, newMember) {
      const wasBoosting = !!oldMember.premiumSince;
      const isBoosting  = !!newMember.premiumSince;
      if (wasBoosting === isBoosting) return;

      const embed = new EmbedBuilder()
        .setColor(isBoosting ? 0xF47FFF : 0x99AAB5)
        .setTitle(isBoosting ? "💎 Server Boosted!" : "💎 Boost Removed")
        .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "User",   value: `${newMember.user.tag} (<@${newMember.id}>)`,                        inline: true },
          { name: "Level",  value: `Tier ${newMember.guild.premiumTier}`,                               inline: true },
          { name: "Boosts", value: `\`${newMember.guild.premiumSubscriptionCount}\` total`,             inline: true },
        )
        .setFooter({ text: `${isBoosting ? "Boost Added" : "Boost Removed"} • ${newMember.guild.name}` })
        .setTimestamp();
      await sendLog(client, newMember.guild, "boost", embed);
    },
  },

];
