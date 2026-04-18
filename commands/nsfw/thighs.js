const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");

module.exports = {
  name: "thighs",
  description: "Get random anime thigh images.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    if (!ctx.message.channel.nsfw) return reply(ctx, { content: "NSFW only!" });
    try {
      const { url } = await fetchNsfw("thighs");
      const embed = new EmbedBuilder().setColor(0xED4245).setTitle("Random Thighs").setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};