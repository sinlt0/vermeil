// ============================================================
//  commands/collection/daily.js
//  $dk / $dailykakera — collect daily kakera
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { rollDailyKakera }          = require("../../utils/collection/kakera");
const { fromConnection: UserStats }= require("../../models/collection/UserStats");
const { formatTimeRemaining }      = require("../../utils/collection/cooldownUtils");
const { getActivePerks }           = require("../../utils/collection/badgeUtils");

const DAILY_COOLDOWN = 20 * 60 * 60 * 1000; // 20 hours

module.exports = {
  name: "dk", description: "Collect your daily kakera.",
  category: "collection", aliases: ["dailykakera","daily"],
  usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    let stats = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId });
    if (!stats) stats = await UserStats(guildDb.connection).create({ guildId: guild.id, userId });

    // Check cooldown
    if (stats.dailyAvailableAt && new Date(stats.dailyAvailableAt) > new Date()) {
      const ms = new Date(stats.dailyAvailableAt).getTime() - Date.now();
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(`⏳ Daily kakera available in **${formatTimeRemaining(ms)}**`)] });
    }

    const perks   = getActivePerks(stats);
    const amount  = rollDailyKakera();
    const newTotal = (stats.kakera ?? 0) + amount;

    // Streak
    const lastDaily = stats.dailyAvailableAt
      ? new Date(stats.dailyAvailableAt).getTime() - DAILY_COOLDOWN
      : 0;
    const withinStreak = Date.now() - lastDaily < DAILY_COOLDOWN + 12 * 60 * 60 * 1000; // 12h grace
    const newStreak    = withinStreak ? (stats.dailyStreak ?? 0) + 1 : 1;

    const updates = {
      $inc: { kakera: amount, totalKakeraSent: amount },
      $set: {
        dailyAvailableAt: new Date(Date.now() + DAILY_COOLDOWN),
        dailyStreak: newStreak,
      },
    };

    // Gold IV: restore full react power
    if (perks.dailyRestoresPower) {
      updates.$set.kakeraReactPower = 100;
      updates.$set.kakeraLastRegen  = new Date();
    }

    await UserStats(guildDb.connection).findOneAndUpdate({ guildId: guild.id, userId }, updates, { upsert: true });

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle("💛 Daily Kakera!")
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Received",  value: `💜 **${amount}** kakera`, inline: true },
        { name: "Total",     value: `💜 **${newTotal.toLocaleString()}**`,  inline: true },
        { name: "Streak",    value: `🔥 ${newStreak} day${newStreak !== 1 ? "s" : ""}`, inline: true },
        ...(perks.dailyRestoresPower ? [{ name: "Gold IV Perk", value: "🔋 React power restored to 100%!", inline: false }] : []),
      )
      .setFooter({ text: "Come back in 20 hours for your next daily!" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
