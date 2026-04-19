// ============================================================
//  events/automod/mentionFilter.js
//  Handles: @user spam, @role spam, @everyone/@here
// ============================================================
const { isAutomodWhitelisted, isChannelWhitelisted, handleHeat, instantPunish, getConfig } = require("../../utils/automod/automodUtils");
const { getMentionHeat, hasEveryoneMention } = require("../../utils/automod/mentionDetector");
const { fromConnection: AntiNukeConfig } = require("../../models/AntiNukeConfig");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;

    const config = await getConfig(client, message.guild.id);
    if (!config?.enabled)           return;
    if (!config?.filters?.mentions) return;

    // Whitelist checks
    if (await isAutomodWhitelisted(client, message.guild, message.member))             return;
    if (await isChannelWhitelisted(client, message.guild, message.channelId, "mentions")) return;

    // Get main roles from antinuke config for public role detection
    const guildDb = await client.db.getGuildDb(message.guild.id);
    const anConfig = guildDb
      ? await AntiNukeConfig(guildDb.connection).findOne({ guildId: message.guild.id }).lean()
      : null;
    const mainRoles = anConfig?.mainRoles ?? [];

    // Get @everyone whitelist
    if (hasEveryoneMention(message)) {
      if (await isChannelWhitelisted(client, message.guild, message.channelId, "everyone")) return;
    }

    const mentionResults = getMentionHeat(message, mainRoles);

    for (const result of mentionResults) {
      if (result.heat >= 100) {
        // Instant punishment for @everyone
        await instantPunish(
          client, message, result.type,
          config.filters.everyoneAction ?? "timeout",
          `Pinged @everyone or a public role`
        );
        return;
      }
      await handleHeat(client, message, result.type, result.heat, `Mention spam detected`);
    }
  },
};
