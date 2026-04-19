// ============================================================
//  events/logs/serverLogs.js
//  Channel, role, server settings create/update/delete
// ============================================================
const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

async function getExecutor(guild, type, limit = 3) {
  try {
    await new Promise(r => setTimeout(r, 500));
    const logs  = await guild.fetchAuditLogs({ type, limit });
    const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < 5000);
    return entry?.executor ?? null;
  } catch { return null; }
}

module.exports = [

  // ── CHANNEL EVENTS ────────────────────────────────────
  {
    name: "channelCreate",
    once: false,
    async execute(client, channel) {
      if (!channel.guild) return;
      const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate);
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("📢 Channel Created")
        .addFields(
          { name: "Channel",  value: `${channel} (\`${channel.name}\`)`, inline: true },
          { name: "Type",     value: `\`${getChannelType(channel.type)}\``, inline: true },
          { name: "Created By", value: executor ? `${executor.tag}` : "Unknown", inline: true },
        )
        .setFooter({ text: `Channel Created • ${channel.guild.name}` })
        .setTimestamp();
      await sendLog(client, channel.guild, "server", embed);
    },
  },

  {
    name: "channelDelete",
    once: false,
    async execute(client, channel) {
      if (!channel.guild) return;
      const executor = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("📢 Channel Deleted")
        .addFields(
          { name: "Name",     value: `\`${channel.name}\``,                        inline: true },
          { name: "Type",     value: `\`${getChannelType(channel.type)}\``,        inline: true },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown",  inline: true },
        )
        .setFooter({ text: `Channel Deleted • ${channel.guild.name}` })
        .setTimestamp();
      await sendLog(client, channel.guild, "server", embed);
    },
  },

  {
    name: "channelUpdate",
    once: false,
    async execute(client, oldChannel, newChannel) {
      if (!newChannel.guild) return;
      const changes = [];
      if (oldChannel.name  !== newChannel.name)  changes.push({ name: "Name",  before: oldChannel.name,  after: newChannel.name });
      if (oldChannel.topic !== newChannel.topic) changes.push({ name: "Topic", before: oldChannel.topic ?? "*None*", after: newChannel.topic ?? "*None*" });
      if (!changes.length) return;

      const executor = await getExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate);
      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle("📢 Channel Updated")
        .addFields(
          { name: "Channel",    value: `${newChannel}`,                                  inline: true },
          { name: "Updated By", value: executor ? `${executor.tag}` : "Unknown",        inline: true },
          ...changes.map(c => ({ name: c.name, value: `**Before:** ${c.before}\n**After:** ${c.after}`, inline: false })),
        )
        .setFooter({ text: `Channel Updated • ${newChannel.guild.name}` })
        .setTimestamp();
      await sendLog(client, newChannel.guild, "server", embed);
    },
  },

  // ── ROLE EVENTS ───────────────────────────────────────
  {
    name: "roleCreate",
    once: false,
    async execute(client, role) {
      const executor = await getExecutor(role.guild, AuditLogEvent.RoleCreate);
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🎭 Role Created")
        .addFields(
          { name: "Role",       value: `<@&${role.id}> (\`${role.name}\`)`,          inline: true },
          { name: "Color",      value: role.hexColor,                                  inline: true },
          { name: "Created By", value: executor ? `${executor.tag}` : "Unknown",      inline: true },
        )
        .setFooter({ text: `Role Created • ${role.guild.name}` })
        .setTimestamp();
      await sendLog(client, role.guild, "server", embed);
    },
  },

  {
    name: "roleDelete",
    once: false,
    async execute(client, role) {
      const executor = await getExecutor(role.guild, AuditLogEvent.RoleDelete);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🎭 Role Deleted")
        .addFields(
          { name: "Name",       value: `\`${role.name}\``,                             inline: true },
          { name: "Color",      value: role.hexColor,                                  inline: true },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown",      inline: true },
        )
        .setFooter({ text: `Role Deleted • ${role.guild.name}` })
        .setTimestamp();
      await sendLog(client, role.guild, "server", embed);
    },
  },

  {
    name: "roleUpdate",
    once: false,
    async execute(client, oldRole, newRole) {
      const changes = [];
      if (oldRole.name     !== newRole.name)     changes.push({ name: "Name",  before: oldRole.name,     after: newRole.name });
      if (oldRole.hexColor !== newRole.hexColor) changes.push({ name: "Color", before: oldRole.hexColor, after: newRole.hexColor });
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield)
        changes.push({ name: "Permissions", before: "Changed", after: "See audit log" });
      if (!changes.length) return;

      const executor = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate);
      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle("🎭 Role Updated")
        .addFields(
          { name: "Role",       value: `<@&${newRole.id}>`,                           inline: true },
          { name: "Updated By", value: executor ? `${executor.tag}` : "Unknown",     inline: true },
          ...changes.map(c => ({ name: c.name, value: `**Before:** ${c.before}\n**After:** ${c.after}`, inline: false })),
        )
        .setFooter({ text: `Role Updated • ${newRole.guild.name}` })
        .setTimestamp();
      await sendLog(client, newRole.guild, "server", embed);
    },
  },

  // ── GUILD UPDATE ──────────────────────────────────────
  {
    name: "guildUpdate",
    once: false,
    async execute(client, oldGuild, newGuild) {
      const changes = [];
      if (oldGuild.name               !== newGuild.name)               changes.push({ name: "Name",               before: oldGuild.name,               after: newGuild.name });
      if (oldGuild.icon               !== newGuild.icon)               changes.push({ name: "Icon",               before: "Changed",                   after: "See thumbnail" });
      if (oldGuild.verificationLevel  !== newGuild.verificationLevel)  changes.push({ name: "Verification Level", before: `\`${oldGuild.verificationLevel}\``, after: `\`${newGuild.verificationLevel}\`` });
      if (oldGuild.vanityURLCode      !== newGuild.vanityURLCode)      changes.push({ name: "Vanity URL",         before: oldGuild.vanityURLCode ?? "None", after: newGuild.vanityURLCode ?? "None" });
      if (!changes.length) return;

      const executor = await getExecutor(newGuild, AuditLogEvent.GuildUpdate);
      const embed = new EmbedBuilder()
        .setColor(0xFF9800)
        .setTitle("⚙️ Server Updated")
        .setThumbnail(newGuild.iconURL({ dynamic: true }))
        .addFields(
          { name: "Updated By", value: executor ? `${executor.tag}` : "Unknown", inline: true },
          ...changes.map(c => ({ name: c.name, value: `**Before:** ${c.before}\n**After:** ${c.after}`, inline: false })),
        )
        .setFooter({ text: `Server Updated • ${newGuild.name}` })
        .setTimestamp();
      await sendLog(client, newGuild, "server", embed);
    },
  },

];

function getChannelType(type) {
  const types = { 0:"Text", 2:"Voice", 4:"Category", 5:"Announcement", 11:"Thread", 13:"Stage", 15:"Forum" };
  return types[type] ?? `Type ${type}`;
}
