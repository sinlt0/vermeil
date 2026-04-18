const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "neko",
  description: "Get a random NSFW neko image.",
  category: "nsfw",
  aliases: ["nsfwneko"],
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("neko")
    .setDescription("Get a random NSFW neko image.")
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    try {
      const { url, provider } = await fetchNsfw("neko");
      const embed = new EmbedBuilder().setColor(0xED4245).setTitle(`${e.neko} NSFW Neko`).setImage(url).setFooter({ text: `Source: ${provider.replace('_', ' ')}` });
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch image. Please try again later." });
    }
  },
};