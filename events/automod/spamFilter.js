// ============================================================
//  events/automod/spamFilter.js
//  Handles: normal message spam, similar messages, emoji spam,
//  wall of text, excessive newlines, inactive channel spam
// ============================================================
const { isAutomodWhitelisted, isChannelWhitelisted, handleHeat, getConfig } = require("../../utils/automod/automodUtils");
const { checkSpam } = require("../../utils/automod/spamDetector");
const { HEAT_WEIGHTS } = require("../../utils/automod/heatEngine");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;
    if (!message.content)   return;

    const config = await getConfig(client, message.guild.id);
    if (!config?.enabled)             return;
    if (!config?.filters?.antiSpam)   return;

    // Whitelist checks
    if (await isAutomodWhitelisted(client, message.guild, message.member))          return;
    if (await isChannelWhitelisted(client, message.guild, message.channelId, "spam")) return;

    // ── Normal message base heat ──────────────────────────
    if (config.filters.normalMessage) {
      await handleHeat(client, message, "Spam", HEAT_WEIGHTS.normalMessage, "Sending too many messages");
    }

    // ── Spam pattern detection ────────────────────────────
    const spamResults = checkSpam(message.guild.id, message.author.id, message, config);

    for (const result of spamResults) {
      await handleHeat(client, message, result.type, result.heat, `Detected: ${result.type}`);
    }
  },
};
