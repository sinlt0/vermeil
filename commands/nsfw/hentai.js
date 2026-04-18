const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "hentai",
  description: "Get a random hentai image.",
  category: "nsfw",
  aliases: ["h"],
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("hentai")
    .setDescription("Get a random hentai image.")
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) {
      return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });
    }

    try {
      const { url, provider } = await fetchNsfw("hentai");

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${e.hentai} Random Hentai`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider.replace('_', ' ')}` });

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch image from all providers. Please try again later." });
    }
  },
};