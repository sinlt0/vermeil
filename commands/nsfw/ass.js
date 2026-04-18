const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "ass",
  description: "Get random ass images (Anime or IRL).",
  category: "nsfw",
  usage: "[irl]",
  cooldown: 5,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("ass")
    .setDescription("Get random ass images (Anime or IRL).")
    .addStringOption(o => o.setName("type").setDescription("Anime or IRL?").addChoices({ name: "Anime", value: "ass" }, { name: "IRL", value: "ass_irl" }).setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    if (!channel.nsfw) return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!` });

    const type = ctx.type === "prefix" ? (ctx.args[0]?.toLowerCase() === "irl" ? "ass_irl" : "ass") : (ctx.interaction.options.getString("type") || "ass");

    try {
      const { url, provider } = await fetchNsfw(type);
      const isIrl = type.includes("irl");

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: `Vermeil NSFW | ${isIrl ? 'Real Life' : 'Anime'}`, iconURL: client.user.displayAvatarURL() })
        .setTitle(`${e.ass} Random ${isIrl ? 'IRL' : 'Anime'} Ass`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider.replace('_', ' ')} | High Quality` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("next_ass").setLabel("Next").setStyle(ButtonStyle.Secondary).setEmoji("🔄")
      );

      const msg = await reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: "Failed to fetch content. Please try again." });
    }
  },
};