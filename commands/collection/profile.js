// ============================================================
//  commands/collection/profile.js
//  $p [@user] — show collection profile
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: UserStats }      = require("../../models/collection/UserStats");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");
const { fromConnection: Wishlist }       = require("../../models/collection/Wishlist");
const { BADGE_ORDER, BADGES, getActivePerks } = require("../../utils/collection/badgeUtils");
const { getAllTimers }                   = require("../../utils/collection/cooldownUtils");

module.exports = {
  name: "p", description: "View collection profile.",
  category: "collection", aliases: ["profile","mp","myprofile"],
  usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const target  = message.mentions.users.first() ?? message.author;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const stats  = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId: target.id }).lean() ?? {};
    const perks  = getActivePerks(stats);
    const timers = await getAllTimers(guildDb.connection, guild.id, target.id, {});

    const haremCount = await UserCollection(guildDb.connection).countDocuments({ guildId: guild.id, userId: target.id });
    const wishCount  = await Wishlist(guildDb.connection).countDocuments({ guildId: guild.id, userId: target.id });

    // Badge display
    const badgeDisplay = BADGE_ORDER
      .filter(k => (stats.badges?.[k]?.level ?? 0) > 0)
      .map(k => `${BADGES[k].emoji}${"★".repeat(stats.badges[k].level)}`)
      .join(" ") || "*No badges yet*";

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`${target.username}'s Collection Profile`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "💜 Kakera",       value: `**${(stats.kakera ?? 0).toLocaleString()}**`,            inline: true },
        { name: "💕 Harem",        value: `**${haremCount}** characters`,                            inline: true },
        { name: "⭐ Wishlist",      value: `**${wishCount}** entries`,                               inline: true },
        { name: "🎲 Total Rolls",  value: `**${stats.rollsUsedTotal ?? 0}**`,                        inline: true },
        { name: "💍 Total Claims", value: `**${stats.totalClaims ?? 0}**`,                           inline: true },
        { name: "🔥 Daily Streak", value: `**${stats.dailyStreak ?? 0}** days`,                     inline: true },
        { name: "⏳ Claim Timer",  value: timers.claim.ready ? "✅ Ready!" : timers.claim.display,  inline: true },
        { name: "🎲 Rolls Left",   value: `**${timers.rolls.left}** rolls`,                         inline: true },
        { name: "📅 Daily",        value: timers.daily.ready ? "✅ Ready!" : timers.daily.display,  inline: true },
        { name: "🏅 Badges",       value: badgeDisplay,                                             inline: false },
      )
      .setFooter({ text: `Wishlist slots: ${perks.wishlistSlots} • Spawn boost: ${perks.wishlistSpawnMult}x` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
