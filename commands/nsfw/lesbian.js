const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "lesbian",
  description: "Get random lesbian NSFW content.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("lesbian")
    .setDescription("Get random lesbian NSFW content.")
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    try {
      const { url } = await fetchNsfw("lesbian");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("👭 Lesbian Content")
        .setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch image. Please try again." });
    }
  },
};