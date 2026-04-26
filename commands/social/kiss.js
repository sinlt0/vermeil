const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchSocial } = require("../../utils/socialApiUtils");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "kiss",
  description: "Kiss a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    const target = ctx.message.mentions.users.first();
    const author = ctx.message.author;

    if (!target) return reply(ctx, { content: "Please mention a user to kiss!" });
    if (target.id === author.id) return reply(ctx, { content: "You can't kiss yourself!" });

    try {
      const { url, provider } = await fetchSocial("kiss");
      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setDescription(`**${author.username}** kissed **${target.username}**! ${e.kiss}`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider}` });
      
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch animation." });
    }
  },
};