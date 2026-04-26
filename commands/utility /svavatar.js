const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/utilityemoji");

module.exports = {
  name:             "svavatar",
  description:      "View this server's avatar/icon.",
  category:         "utility",
  aliases:          ["serveravatar", "servericon", "guildicon"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("svavatar")
    .setDescription("View this server's avatar/icon.")
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    if (!guild) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x4A3F5F)
            .setTitle(`${e.warning} Server Only`)
            .setDescription("This command can only be used inside a server."),
        ],
      });
    }

    const iconUrl = guild.iconURL({ dynamic: true, size: 1024 });
    if (!iconUrl) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x4A3F5F)
            .setTitle(`${e.warning} No Server Icon`)
            .setDescription("This server does not have an avatar/icon."),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.server} ${guild.name}'s Server Avatar`)
      .setImage(iconUrl)
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Server Avatar")
        .setURL(iconUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.link)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};