const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/utilityemoji");

module.exports = {
  name:             "coin",
  description:      "Flip a coin.",
  category:         "utility",
  aliases:          ["coin", "flip"],
  usage:            "",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Flip a coin.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const result = Math.random() < 0.5 ? "Heads" : "Tails";
    const emoji = result === "Heads" ? e.heads : e.tails;

    const embed = new EmbedBuilder()
      .setColor(0xFEE75C)
      .setTitle(`${e.coin} Coin Flip`)
      .setDescription(`${emoji} The coin landed on **${result}**!`)
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};