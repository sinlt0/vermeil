const { EmbedBuilder } = require("discord.js");
const { reply } = require("../commandRunner");
const { fetchSocial } = require("../socialApiUtils");

/**
 * Base executor for social commands
 * @param {string} action The action name (hug, kiss, etc.)
 * @param {string} label The verb to show in embed (hugged, kissed)
 * @param {string} emoji The emoji to show
 * @param {boolean} requiresTarget Whether a user target is needed
 */
async function executeSocial(client, ctx, { action, label, emoji, requiresTarget = true }) {
  const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
  const target = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");

  let description = "";
  if (requiresTarget) {
    if (!target) return reply(ctx, { content: `Please mention a user to ${action}!` });
    if (target.id === author.id) return reply(ctx, { content: `You can't ${action} yourself!` });
    description = `**${author.username}** ${label} **${target.username}**! ${emoji}`;
  } else {
    description = `**${author.username}** ${label}! ${emoji}`;
  }

  try {
    const { url, provider } = await fetchSocial(action);
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setDescription(description)
      .setImage(url)
      .setFooter({ text: `Source: ${provider.replace('_', ' ')}` });
    
    return reply(ctx, { embeds: [embed] });
  } catch (err) {
    console.error(`[Social] Error in ${action}:`, err.message);
    return reply(ctx, { content: `Failed to fetch animation for ${action}.` });
  }
}

module.exports = { executeSocial };
