// ============================================================
//  commands/info/botinfo.js
//  Upgraded detailed information about the bot
// ============================================================
const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  version: discordVersion 
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const pkg = require("../../package.json");
const e = require("../../emojis/infoemoji");
const os = require("os");

module.exports = {
  name:             "botinfo",
  description:      "View premium detailed information about the bot.",
  category:         "info",
  aliases:          ["bi", "stats", "info"],
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
    
    // ── Data Gathering ──
    const uptime = formatUptime(client.uptime);
    const memory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    
    const guilds = client.guilds.cache.size.toLocaleString();
    const users = client.guilds.cache.reduce((a, b) => a + (b.memberCount || 0), 0).toLocaleString();
    const channels = client.channels.cache.size.toLocaleString();
    
    const cmdCount = client.commands.size;
    const createdAt = Math.floor(client.user.createdTimestamp / 1000);

    // ── Build Embed ──
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.star} Vermeil Statistics`)
      .setDescription(`Vermeil is a high-performance, All-In-One Discord bot designed for professional community management and engagement.`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: `${e.bot} General Info`,
          value: [
            `**Username:** ${client.user.tag}`,
            `**ID:** \`${client.user.id}\``,
            `**Created:** <t:${createdAt}:R>`,
            `**Library:** Discord.js v${discordVersion}`,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.server} Statistics`,
          value: [
            `**Servers:** \`${guilds}\``,
            `**Users:** \`${users}\``,
            `**Channels:** \`${channels}\``,
            `**Commands:** \`${cmdCount}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.shield} System Resources`,
          value: [
            `**Uptime:** \`${uptime}\``,
            `**Ping:** \`${client.ws.ping}ms\``,
            `**Memory:** \`${memory} MB / ${totalMem} GB\``,
            `**Platform:** \`${os.platform()}\``,
          ].join("\n"),
          inline: false,
        }
      )
      .setFooter({
        text: `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // ── Interactive Buttons ──
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite Me")
        .setURL(client.config?.inviteLink || "https://discord.com")
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.invite),
      new ButtonBuilder()
        .setLabel("Support Server")
        .setURL(client.config?.supportServer || "https://discord.gg")
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.support)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}
