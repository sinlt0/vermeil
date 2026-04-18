const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "roast",
  description: "Roast a user (or yourself).",
  category: "fun",
  usage: "[user]",
  cooldown: 5,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("roast")
    .setDescription("Roast a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to roast").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const target = ctx.type === "prefix" ? (ctx.message.mentions.users.first() || ctx.message.author) : (ctx.interaction.options.getUser("user") || ctx.interaction.user);

    try {
      const res = await axios.get("https://evilinsult.com/generate_insult.php?lang=en&type=json");
      const data = res.data;

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${e.roast} Roasted!`)
        .setDescription(`**${target.username}**, ${data.insult.charAt(0).toLowerCase() + data.insult.slice(1)}`)
        .setFooter({ text: "Source: evilinsult.com" });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to generate roast. You got lucky today!" });
    }
  },
};