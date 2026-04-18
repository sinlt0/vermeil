const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");

module.exports = {
  name: "anal",
  description: "Anal interaction (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    if (!ctx.message.channel.nsfw) return reply(ctx, { content: "NSFW only!" });
    const target = ctx.message.mentions.users.first();
    if (!target) return reply(ctx, { content: "Mention a user!" });
    try {
      const { url } = await fetchNsfw("anal");
      const embed = new EmbedBuilder().setColor(0xED4245).setDescription(`**${ctx.message.author.username}** is going anal on **${target.username}**!`).setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};