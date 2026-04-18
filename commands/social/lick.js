const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchSocial } = require("../../utils/socialApiUtils");

module.exports = {
  name: "lick",
  description: "Lick a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    const target = ctx.message.mentions.users.first();
    if (!target) return reply(ctx, { content: "Mention a user!" });
    try {
      const { url } = await fetchSocial("lick");
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(`**${ctx.message.author.username}** licked **${target.username}**!`).setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};