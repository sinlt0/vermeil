const { EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchSocial } = require("../../utils/socialApiUtils");

module.exports = {
  name: "smug",
  description: "Show how smug you are.",
  category: "social",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    try {
      const { url } = await fetchSocial("smug");
      const embed = new EmbedBuilder().setColor(0x4A3F5F).setDescription(`**${ctx.message.author.username}** is feeling smug!`).setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch { return reply(ctx, { content: "Error fetching image." }); }
  }
};