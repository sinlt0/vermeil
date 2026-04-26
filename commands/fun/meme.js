const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "meme",
  description: "Get a random meme from Reddit.",
  category: "fun",
  aliases: ["m"],
  usage: "",
  cooldown: 3,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Get a random meme from Reddit.")
    .toJSON(),

  async execute(client, ctx) {
    try {
      const res = await axios.get("https://meme-api.com/gimme");
      const data = res.data;

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.meme} ${data.title}`)
        .setURL(data.postLink)
        .setImage(data.url)
        .setFooter({ text: `👍 ${data.ups} | r/${data.subreddit}` });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch a meme. Please try again later." });
    }
  },
};