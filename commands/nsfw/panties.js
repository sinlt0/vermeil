const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "panties",
  description: "Get random anime panty images.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("panties")
    .setDescription("Get random anime panty images.")
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    try {
      const { url } = await fetchNsfw("panties");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("👙 Anime Panties")
        .setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch image. Please try again." });
    }
  },
};