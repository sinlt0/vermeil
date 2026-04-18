const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "yuri",
  description: "Get random NSFW yuri (girl on girl) content.",
  category: "nsfw",
  aliases: ["lesbian-gif"],
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("yuri")
    .setDescription("Get random NSFW yuri (girl on girl) content.")
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    try {
      const { url, provider } = await fetchNsfw("yuri");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: "Vermeil NSFW | Yuri Content", iconURL: client.user.displayAvatarURL() })
        .setTitle("👭 Random Yuri")
        .setImage(url)
        .setFooter({ text: `Source: ${provider.replace('_', ' ')}` });
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch image. Please try again later." });
    }
  },
};