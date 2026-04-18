const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");

module.exports = {
  name: "panties",
  description: "Get random anime panty images.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    if (!ctx.message.channel.nsfw) return reply(ctx, { content: "NSFW only!" });
    try {
      const { url } = await fetchNsfw("panties");
      const embed = new EmbedBuilder().setColor(0xED4245).setTitle("Random Panties").setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};