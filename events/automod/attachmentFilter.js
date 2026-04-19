// ============================================================
//  events/automod/attachmentFilter.js
//  Handles: image spam, file spam, embed spam
// ============================================================
const { isAutomodWhitelisted, isChannelWhitelisted, handleHeat, getConfig } = require("../../utils/automod/automodUtils");
const { HEAT_WEIGHTS } = require("../../utils/automod/heatEngine");

// Track recent attachment messages per user per guild
const attachmentTracker = new Map();
const WINDOW_MS         = 8000;

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;

    // Only process if message has attachments or embeds
    if (message.attachments.size === 0 && message.embeds.length === 0) return;

    const config = await getConfig(client, message.guild.id);
    if (!config?.enabled)             return;
    if (!config?.filters?.attachments) return;

    if (await isAutomodWhitelisted(client, message.guild, message.member))           return;
    if (await isChannelWhitelisted(client, message.guild, message.channelId, "spam")) return;

    const key = `${message.guild.id}_${message.author.id}`;
    const now = Date.now();

    if (!attachmentTracker.has(key)) attachmentTracker.set(key, []);
    const history = attachmentTracker.get(key).filter(t => now - t < WINDOW_MS);
    history.push(now);
    attachmentTracker.set(key, history);

    // 3+ attachments/embeds in 8 seconds = spam
    if (history.length >= 3) {
      await handleHeat(
        client, message,
        "Attachment/Image Spam",
        HEAT_WEIGHTS.attachment,
        `Sending too many files or images`
      );
    }

    // Auto-cleanup
    setTimeout(() => {
      const cur = attachmentTracker.get(key);
      if (cur) {
        const fresh = cur.filter(t => Date.now() - t < WINDOW_MS);
        if (!fresh.length) attachmentTracker.delete(key);
        else attachmentTracker.set(key, fresh);
      }
    }, WINDOW_MS + 100);
  },
};
