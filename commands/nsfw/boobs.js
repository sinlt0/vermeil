const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "boobs",
  description: "Get random boobs images (Anime or IRL).",
  category: "nsfw",
  usage: "[irl]",
  cooldown: 5,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("boobs")
    .setDescription("Get random boobs images (Anime or IRL).")
    .addStringOption(o => o.setName("type").setDescription("Anime or IRL?").addChoices({ name: "Anime", value: "boobs" }, { name: "IRL", value: "boobs_irl" }).setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    const type = ctx.type === "prefix" ? (ctx.args[0]?.toLowerCase() === "irl" ? "boobs_irl" : "boobs") : (ctx.interaction.options.getString("type") || "boobs");

    try {
      const { url, provider } = await fetchNsfw(type);
      const isIrl = type.includes("irl");

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: `Vermeil NSFW | ${isIrl ? 'Real Life' : 'Anime'}`, iconURL: client.user.displayAvatarURL() })
        .setTitle(`${e.boobs} Random ${isIrl ? 'IRL' : 'Anime'} Boobs`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider.replace('_', ' ')} | High Quality` })
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch content. Please try again." });
    }
  },
};