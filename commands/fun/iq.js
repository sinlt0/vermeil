const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");

module.exports = {
  name: "iq",
  description: "Calculate a user's IQ (totally scientific).",
  category: "fun",
  usage: "[user]",
  cooldown: 5,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("iq")
    .setDescription("Calculate a user's IQ.")
    .addUserOption(o => o.setName("user").setDescription("The user to test").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const target = ctx.type === "prefix" ? (ctx.message.mentions.users.first() || ctx.message.author) : (ctx.interaction.options.getUser("user") || ctx.interaction.user);
    const iq = Math.floor(Math.random() * 150) + 50;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.iq} IQ Test`)
      .setDescription(`**${target.username}** has an IQ of **${iq}**!`)
      .setFooter({ text: iq > 120 ? "Wow, a genius!" : iq < 80 ? "Uh oh..." : "Pretty average." });

    return reply(ctx, { embeds: [embed] });
  },
};