const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchSocial } = require("../../utils/socialApiUtils");

module.exports = {
  name: "dance",
  description: "Dance around!",
  category: "social",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    try {
      const { url } = await fetchSocial("dance");
      const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(`**${ctx.message.author.username}** is dancing!`).setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};