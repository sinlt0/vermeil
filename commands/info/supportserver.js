// ============================================================
//  commands/info/supportserver.js
//  Upgraded support server command
// ============================================================
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/infoemoji");

module.exports = {
  name:             "supportserver",
  description:      "Join the official Vermeil support community.",
  category:         "info",
  aliases:          ["support", "ss", "server"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("supportserver")
    .setDescription("Join the official Vermeil support community.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const supportUrl = client.config?.supportServer || "https://discord.gg/KdnAKcHupW";

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.support} Vermeil Support Community`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        `Need help with setup? Want to suggest a feature? Join our community today!\n\n` +
        `${e.help} **Instant Help:** Get setup assistance.\n` +
        `${e.command} **Latest News:** Be the first to see updates.\n` +
        `${e.team} **Active Community:** Meet other server owners.`
      )
      .setFooter({
        text: `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Join Server")
        .setURL(supportUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.support),
      new ButtonBuilder()
        .setLabel("Website")
        .setURL("http://localhost:25104") // Using your web port
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.help)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};