// ============================================================
//  events/automod/wordFilter.js
//  Handles: blacklisted words (exact + wildcard)
// ============================================================
const { isAutomodWhitelisted, isChannelWhitelisted, instantPunish, getConfig } = require("../../utils/automod/automodUtils");
const { fromConnection: BlacklistedWord } = require("../../models/BlacklistedWord");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;
    if (!message.content)   return;

    const config = await getConfig(client, message.guild.id);
    if (!config?.enabled) return;

    if (await isAutomodWhitelisted(client, message.guild, message.member))           return;
    if (await isChannelWhitelisted(client, message.guild, message.channelId, "spam")) return;

    const guildDb = await client.db.getGuildDb(message.guild.id);
    if (!guildDb || guildDb.isDown) return;

    const WordModel = BlacklistedWord(guildDb.connection);
    const words     = await WordModel.find({ guildId: message.guild.id }).lean();
    if (!words.length) return;

    // Sanitize content for checking
    const sanitized = message.content
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")     // remove accents
      .replace(/[^\w\s]/g, " ")              // remove special chars
      .replace(/\s+/g, " ")
      .trim();

    for (const entry of words) {
      const word = entry.word.toLowerCase();
      let matched = false;

      if (entry.type === "exact") {
        // Exact word match (whole word, case insensitive)
        const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "i");
        matched = regex.test(sanitized) || regex.test(message.content.toLowerCase());
      } else {
        // Wildcard: *word* means contains, word* means starts with, *word means ends with
        const pattern = word
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".");
        const regex = new RegExp(pattern, "i");
        matched = regex.test(sanitized) || regex.test(message.content.toLowerCase());
      }

      if (matched) {
        await instantPunish(
          client, message,
          "Blacklisted Word",
          config.punishment.action ?? "timeout",
          `Used a blacklisted word`
        );
        return; // Only punish once even if multiple words match
      }
    }
  },
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
