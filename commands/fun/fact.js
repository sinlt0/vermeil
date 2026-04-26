const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "fact",
  description: "Get a random useless fact.",
  category: "fun",
  usage: "",
  cooldown: 5,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("fact")
    .setDescription("Get a random useless fact.")
    .toJSON(),

  async execute(client, ctx) {
    try {
      const res = await axios.get("https://uselessfacts.jsph.pl/api/v2/facts/random");
      const data = res.data;

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.fact} Random Fact`)
        .setDescription(data.text)
        .setFooter({ text: "Source: uselessfacts.jsph.pl" });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch fact. Try again later." });
    }
  },
};