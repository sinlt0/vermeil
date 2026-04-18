const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "spank",
  description: "Spank a user (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("spank")
    .setDescription("Spank a user (NSFW).")
    .addUserOption(o => o.setName("user").setDescription("The user to spank.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    const target = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    if (!target) return reply(ctx, { content: "Please mention a user to spank." });
    if (target.id === author.id) return reply(ctx, { content: "You can't spank yourself!" });

    try {
      const { url } = await fetchNsfw("spank");
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`**${author.username}** spanked **${target.username}**! ${e.spank}`)
        .setImage(url);
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch animation. Please try again." });
    }
  },
};