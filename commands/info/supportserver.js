// ============================================================
//  commands/info/supportserver.js
//  Sends the support server invite link
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

const SUPPORT_URL = "https://discord.gg/UjHnCK9A88";

module.exports = {
  name:             "supportserver",
  description:      "Get the support server invite link.",
  category:         "info",
  aliases:          ["support", "ss"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("supportserver")
    .setDescription("Get the support server invite link.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x7d5ba6)
      .setTitle(`${e.support} Support Server`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        `Join the support server for help, updates, and community.\n\n` +
        `${e.help} **Get help** with commands and setup\n` +
        `${e.star} **Stay updated** with new features\n` +
        `${e.team} **Meet the team** and community`
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Join Support Server")
        .setURL(SUPPORT_URL)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.support)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};