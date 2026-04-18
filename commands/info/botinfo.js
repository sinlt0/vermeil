// ============================================================
//  commands/info/botinfo.js
//  Shows detailed information about the bot
// ============================================================
const { SlashCommandBuilder, EmbedBuilder, version: discordVersion } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const pkg = require("../../package.json");

module.exports = {
  name:             "botinfo",
  description:      "View detailed information about the bot.",
  category:         "info",
  aliases:          ["bi"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("View detailed information about the bot.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const createdAt = Math.floor(client.user.createdTimestamp / 1000);
    const memoryUsed = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    const commandCount = client.commands?.size ?? 0;
    const slashCount = client.slashCmds?.size ?? 0;

    const totalMembers = client.guilds.cache.reduce((total, guild) => total + (guild.memberCount ?? 0), 0);

    const embed = new EmbedBuilder()
      .setColor(0x00BCD4)
      .setAuthor({
        name:    `${client.user.username} | Bot Info`,
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name:  "🤖 Bot",
          value: [
            `**Username:** ${client.user.tag}`,
            `**ID:** \`${client.user.id}\``,
            `**Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)`,
          ].join("\n"),
          inline: false,
        },
        {
          name:  "📊 Stats",
          value: [
            `**Servers:** \`${client.guilds.cache.size.toLocaleString()}\``,
            `**Users:** \`${totalMembers.toLocaleString()}\``,
            `**Commands:** \`${commandCount.toLocaleString()}\``,
            `**Slash Commands:** \`${slashCount.toLocaleString()}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "⚙️ System",
          value: [
            `**Ping:** \`${client.ws.ping}ms\``,
            `**Uptime:** \`${formatUptime(client.uptime)}\``,
            `**Memory:** \`${memoryUsed} MB\``,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "📦 Versions",
          value: [
            `**Bot:** \`v${pkg.version}\``,
            `**Node.js:** \`${process.version}\``,
            `**Discord.js:** \`v${discordVersion}\``,
          ].join("\n"),
          inline: true,
        },
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
}