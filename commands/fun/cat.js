const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "cat",
  description: "Get a random cat picture.",
  category: "fun",
  aliases: ["meow", "pussy"],
  usage: "",
  cooldown: 3,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("cat")
    .setDescription("Get a random cat picture.")
    .toJSON(),

  async execute(client, ctx) {
    try {
      const res = await axios.get("https://aws.random.cat/meow");
      const data = res.data;

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.cat} Meow!`)
        .setImage(data.file)
        .setFooter({ text: "Powered by random.cat" });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch a cat picture. Please try again later." });
    }
  },
};