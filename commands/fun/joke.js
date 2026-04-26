const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "joke",
  description: "Get a random joke.",
  category: "fun",
  aliases: ["jk"],
  usage: "",
  cooldown: 3,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("joke")
    .setDescription("Get a random joke.")
    .toJSON(),

  async execute(client, ctx) {
    try {
      const res = await axios.get("https://v2.jokeapi.dev/joke/Any?safe-mode");
      const data = res.data;

      let jokeText = "";
      if (data.type === "single") {
        jokeText = data.joke;
      } else {
        jokeText = `${data.setup}\n\n*${data.delivery}*`;
      }

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.joke} Random Joke`)
        .setDescription(jokeText)
        .setFooter({ text: `Category: ${data.category}` });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch a joke. Please try again later." });
    }
  },
};