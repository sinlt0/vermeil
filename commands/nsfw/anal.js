const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "anal",
  description: "Anal interaction (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("anal")
    .setDescription("Anal interaction (NSFW).")
    .addUserOption(o => o.setName("user").setDescription("The user to target.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    const target = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    if (!target) return reply(ctx, { content: "Please mention a user." });

    try {
      const { url } = await fetchNsfw("anal");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`🍑 **${author.username}** is going anal on **${target.username}**!`)
        .setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch animation. Please try again." });
    }
  },
};