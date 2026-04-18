const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { getUserData, getCooldownString } = require("../../utils/collection/collectionUtils");
const { fromConnection: CollectorSettings } = require("../../models/collector/CollectorSettings");

module.exports = {
  name: "timers",
  description: "Check your roll and claim cooldowns.",
  category: "collection",
  aliases: ["tu", "mu", "ru", "timersup"],
  usage: "",
  cooldown: 3,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const SettingsModel = CollectorSettings(guildDb.connection);
    const settings = await SettingsModel.findOne({ guildId: ctx.guild.id }) || {};
    
    const userData = await getUserData(guildDb, ctx.guild.id, ctx.author.id, settings);

    const rollReset = new Date(userData.lastRollReset.getTime() + (settings.rollResetMinutes || 60) * 60000);
    const claimReset = new Date(userData.lastClaimReset.getTime() + (settings.claimResetMinutes || 180) * 60000);
    
    const now = new Date();
    const rollWait = Math.max(0, rollReset - now);
    const claimWait = Math.max(0, claimReset - now);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("⏳ Collection Cooldowns")
      .addFields(
        { name: "🎲 Rolls", value: userData.rollsAvailable > 0 ? `✅ **${userData.rollsAvailable}** available` : `❌ Ready in **${getCooldownString(rollWait)}**`, inline: true },
        { name: "💖 Claims", value: userData.claimsAvailable > 0 ? "✅ **1** available" : `❌ Ready in **${getCooldownString(claimWait)}**`, inline: true }
      );

    return reply(ctx, { embeds: [embed] });
  },
};