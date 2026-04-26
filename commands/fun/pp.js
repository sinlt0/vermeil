const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");

module.exports = {
  name: "pp",
  description: "Check someone's PP size.",
  category: "fun",
  aliases: ["penis", "size"],
  usage: "[user]",
  cooldown: 5,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("pp")
    .setDescription("Check someone's PP size.")
    .addUserOption(o => o.setName("user").setDescription("The user to check").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const target = ctx.type === "prefix" ? (ctx.message.mentions.users.first() || ctx.message.author) : (ctx.interaction.options.getUser("user") || ctx.interaction.user);
    const size = Math.floor(Math.random() * 15);
    const pp = "8" + "=".repeat(size) + "D";

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.pp} PP Size Machine`)
      .setDescription(`**${target.username}'s** size:\n\`${pp}\``);

    return reply(ctx, { embeds: [embed] });
  },
};