const { EmbedBuilder, WebhookClient } = require("discord.js");
require("dotenv").config();

// Webhook URLs from .env
const webhooks = {
  console: process.env.LOG_CONSOLE_WEBHOOK,
  errors:  process.env.LOG_ERRORS_WEBHOOK,
  commands: process.env.LOG_COMMANDS_WEBHOOK,
};

/**
 * Send a log to a Discord webhook
 * @param {string} type 'console' | 'errors' | 'commands'
 * @param {object} payload { title, description, fields, color }
 */
async function sendWebhookLog(type, { title, description, fields = [], color = 0x5865F2 }) {
  const url = webhooks[type];
  if (!url) return;

  try {
    const webhook = new WebhookClient({ url });
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp();

    if (description) embed.setDescription(description);
    if (fields.length) embed.addFields(fields);

    await webhook.send({ embeds: [embed] });
  } catch (err) {
    // Avoid recursive error logging
    console.error(`[WebhookLog] Failed to send ${type} log:`, err.message);
  }
}

/**
 * Log command usage
 */
async function logCommand(ctx, cmdName) {
  const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
  const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
  const guild  = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

  await sendWebhookLog("commands", {
    title: "📜 Command Executed",
    color: 0x5865F2,
    fields: [
      { name: "Command", value: `\`${cmdName}\``, inline: true },
      { name: "Context", value: `\`${ctx.type.toUpperCase()}\``, inline: true },
      { name: "User", value: `**${author.username}** (${author.id})\nDisplay: ${member?.displayName || "N/A"}`, inline: false },
      { name: "Server", value: `**${guild?.name || "DMs"}**\nID: \`${guild?.id || "N/A"}\``, inline: false },
    ]
  });
}

module.exports = { sendWebhookLog, logCommand };
