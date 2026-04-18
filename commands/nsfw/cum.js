const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "cum",
  description: "Cum on someone (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("cum")
    .setDescription("Cum on someone (NSFW).")
    .addUserOption(o => o.setName("user").setDescription("The user to cum on.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    const target = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    if (!target) return reply(ctx, { content: "Please mention a user." });

    try {
      const { url } = await fetchNsfw("cum");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`**${author.username}** cummed on **${target.username}**! ${e.cum}`)
        .setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch animation. Please try again." });
    }
  },
};