const { EmbedBuilder } = require("discord.js");
const { reply } = require("../commandRunner");
const { fetchNsfw } = require("../nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

/**
 * Base executor for NSFW commands
 * @param {object} options
 * @param {string} options.category Category name for API
 * @param {string} options.title Embed title
 * @param {string} options.emoji Emoji for title
 * @param {string} options.type 'image' | 'interaction' | 'dual'
 * @param {string} options.label Verb for interaction (e.g. 'is fucking')
 */
async function executeNsfw(client, ctx, { category, title, emoji, type = "image", label = "" }) {
  const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
  
  // 🛡️ NSFW Check
  if (!channel.nsfw) {
    return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!`, ephemeral: true });
  }

  const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
  let targetType = category;
  let description = "";

  // ── Handle Types ──
  if (type === "interaction") {
    const target = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    if (!target) return reply(ctx, { content: "Please mention a user!" });
    if (target.id === author.id) return reply(ctx, { content: "You can't do that to yourself!" });
    description = `**${author.username}** ${label} **${target.username}**! ${emoji}`;
  } else if (type === "dual") {
    const mode = ctx.type === "prefix" ? (ctx.args[0]?.toLowerCase() === "irl" ? "irl" : "anime") : (ctx.interaction.options.getString("type") || "anime");
    if (mode === "irl") targetType = `${category}_irl`;
    title = `${emoji} Random ${mode === "irl" ? "IRL" : "Anime"} ${title}`;
  } else {
    title = `${emoji} Random ${title}`;
  }

  try {
    const { url, provider } = await fetchNsfw(targetType);
    
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({ name: `Vermeil NSFW`, iconURL: client.user.displayAvatarURL() })
      .setTitle(title)
      .setImage(url)
      .setFooter({ text: `Source: ${provider.replace('_', ' ')}` })
      .setTimestamp();

    if (description) embed.setDescription(description);
    
    return reply(ctx, { embeds: [embed] });
  } catch (err) {
    console.error(`[NSFW] Error in ${category}:`, err.message);
    return reply(ctx, { content: `Failed to fetch image. Please try again later.` });
  }
}

module.exports = { executeNsfw };
