// ============================================================
//  events/automod/inviteFilter.js
//  Handles: Discord invite link detection — instant punishment
// ============================================================
const { isAutomodWhitelisted, isChannelWhitelisted, instantPunish, getConfig } = require("../../utils/automod/automodUtils");
const { hasDiscordInvite } = require("../../utils/automod/linkScanner");
const { fromConnection: AntiNukeConfig } = require("../../models/AntiNukeConfig");
const { fromConnection: AntiNukeWhitelist } = require("../../models/AntiNukeWhitelist");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;
    if (!message.content)   return;

    if (!hasDiscordInvite(message.content)) return;

    const config = await getConfig(client, message.guild.id);
    if (!config?.enabled)              return;
    if (!config?.filters?.inviteLinks) return;

    if (await isAutomodWhitelisted(client, message.guild, message.member))              return;
    if (await isChannelWhitelisted(client, message.guild, message.channelId, "invites")) return;

    // Check partner channels — invites are allowed there
    const guildDb = await client.db.getGuildDb(message.guild.id);
    if (guildDb) {
      const anConfig = await AntiNukeConfig(guildDb.connection)
        .findOne({ guildId: message.guild.id }).lean();
      if (anConfig?.partnerChannelIds?.includes(message.channelId)) return;
    }

    await instantPunish(
      client, message,
      "Discord Invite Link",
      config.filters.inviteAction ?? "timeout",
      "Posting Discord invite links is not allowed"
    );
  },
};
