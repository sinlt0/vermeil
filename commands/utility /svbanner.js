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
  name:             "svbanner",
  description:      "View this server's banner.",
  category:         "utility",
  aliases:          ["serverbanner", "guildbanner", "svb"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("svbanner")
    .setDescription("View this server's banner.")
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    if (!guild) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`${e.warning} Server Only`)
            .setDescription("This command can only be used inside a server."),
        ],
      });
    }

    const fullGuild = await guild.fetch().catch(() => guild);
    const bannerUrl = fullGuild.bannerURL({ size: 1024 });

    if (!bannerUrl) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`${e.warning} No Server Banner`)
            .setDescription("This server does not have a banner."),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.banner} ${guild.name}'s Server Banner`)
      .setImage(bannerUrl)
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Server Banner")
        .setURL(bannerUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.link)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};