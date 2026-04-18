const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");

module.exports = {
  name: "boobs",
  description: "Get random boobs images (Anime or IRL).",
  category: "nsfw",
  usage: "[irl]",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    if (!ctx.message.channel.nsfw) return reply(ctx, { content: "NSFW only!" });
    try {
      const { url } = await fetchNsfw("boobs");
      const embed = new EmbedBuilder().setColor(0xED4245).setTitle("Random Boobs").setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};