const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "hentai",
  description: "Get a random hentai image.",
  category: "nsfw",
  aliases: ["h"],
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    if (!ctx.message.channel.nsfw) return reply(ctx, { content: `${e.warning} NSFW only!` });

    try {
      const { url, provider } = await fetchNsfw("hentai");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${e.hentai} Random Hentai`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider}` });
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Error fetching image." });
    }
  },
};