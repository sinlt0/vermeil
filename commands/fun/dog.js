const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "dog",
  description: "Get a random dog picture.",
  category: "fun",
  aliases: ["woof", "doggo"],
  usage: "",
  cooldown: 3,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("dog")
    .setDescription("Get a random dog picture.")
    .toJSON(),

  async execute(client, ctx) {
    try {
      const res = await axios.get("https://dog.ceo/api/breeds/image/random");
      const data = res.data;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e.dog} Woof!`)
        .setImage(data.message)
        .setFooter({ text: "Powered by dog.ceo" });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch a dog picture. Please try again later." });
    }
  },
};