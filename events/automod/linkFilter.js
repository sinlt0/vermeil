// ============================================================
//  events/automod/linkFilter.js
//  Handles: blacklisted links + malicious/phishing links
// ============================================================
const { isAutomodWhitelisted, isChannelWhitelisted, instantPunish, getConfig } = require("../../utils/automod/automodUtils");
const { hasMaliciousLink, isBlacklistedLink, extractURLs } = require("../../utils/automod/linkScanner");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;
    if (!message.content)   return;

    // Quick bail if no URLs
    if (!extractURLs(message.content).length && !message.content.includes("http")) return;

    const config = await getConfig(client, message.guild.id);
    if (!config?.enabled) return;

    if (await isAutomodWhitelisted(client, message.guild, message.member))           return;
    if (await isChannelWhitelisted(client, message.guild, message.channelId, "spam")) return;

    const guildDb = await client.db.getGuildDb(message.guild.id);
    if (!guildDb || guildDb.isDown) return;

    // ── Blacklisted links (instant punishment) ────────────
    const blacklisted = await isBlacklistedLink(guildDb.connection, message.guild.id, message.content);
    if (blacklisted) {
      await instantPunish(
        client, message,
        "Blacklisted Link",
        config.punishment.action ?? "timeout",
        `Posted a blacklisted link: ${blacklisted.matched}`
      );
      return;
    }

    // ── Malicious/phishing links ───────────────────────────
    if (config.filters.maliciousLinks && hasMaliciousLink(message.content)) {
      await instantPunish(
        client, message,
        "Malicious/Phishing Link",
        config.filters.maliciousAction ?? "ban",
        "Posted a malicious or phishing link"
      );
      return;
    }
  },
};
