const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchSocial } = require("../../utils/socialApiUtils");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "hug",
  description: "Hug a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    const target = ctx.message.mentions.users.first();
    const author = ctx.message.author;

    if (!target) return reply(ctx, { content: "Please mention a user to hug!" });
    if (target.id === author.id) return reply(ctx, { content: "You can't hug yourself!" });

    try {
      const { url, provider } = await fetchSocial("hug");
      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setDescription(`**${author.username}** hugged **${target.username}**! ${e.hug}`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider}` });
      
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch animation." });
    }
  },
};