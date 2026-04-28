// ============================================================
//  commands/collection/badges.js
//  $badges [@user]  — view badge status + costs
//  $badges buy <badge>  — buy next level of a badge
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { BADGES, BADGE_ORDER, nextLevelCost, getActivePerks } = require("../../utils/collection/badgeUtils");
const { fromConnection: UserStats } = require("../../models/collection/UserStats");

module.exports = {
  name: "badges", description: "View or buy badges.",
  category: "collection", aliases: ["badge","b"],
  usage: "[@user] | buy <badge>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const StatsModel = UserStats(guildDb.connection);

    // ── BUY ────────────────────────────────────────────────
    if (ctx.args[0]?.toLowerCase() === "buy") {
      const badgeName = ctx.args[1]?.toLowerCase();
      if (!badgeName || !BADGES[badgeName]) {
        return message.reply(`❌ Valid badges: \`${BADGE_ORDER.join(", ")}\``);
      }

      const stats   = await StatsModel.findOne({ guildId: guild.id, userId }) ?? { kakera: 0, badges: {} };
      const current = stats.badges?.[badgeName]?.level ?? 0;
      const cost    = nextLevelCost(badgeName, current);

      if (current >= 4) return message.reply(`✅ Your ${BADGES[badgeName].emoji} **${BADGES[badgeName].name}** is already max level!`);
      if (!cost) return message.reply("❌ This badge is already maxed.");

      if ((stats.kakera ?? 0) < cost) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
          .setDescription(`❌ Not enough kakera! Need 💜 **${cost}**, you have 💜 **${stats.kakera ?? 0}**.`)] });
      }

      const newLevel = current + 1;
      await StatsModel.findOneAndUpdate(
        { guildId: guild.id, userId },
        {
          $inc: { kakera: -cost, [`badges.${badgeName}.spent`]: cost },
          $set: { [`badges.${badgeName}.level`]: newLevel, [`badges.${badgeName}.type`]: badgeName },
        },
        { upsert: true }
      );

      const badge = BADGES[badgeName];
      return message.reply({ embeds: [new EmbedBuilder().setColor(badge.color)
        .setTitle(`${badge.emoji} Badge Upgraded!`)
        .setDescription(
          `**${badge.name}** upgraded to **Level ${newLevel}**!\n\n` +
          `✨ **New perk:** ${badge.perks[newLevel - 1]}`
        )
        .setFooter({ text: `Cost: 💜 ${cost} kakera` })] });
    }

    // ── VIEW ────────────────────────────────────────────────
    const target = message.mentions.users.first() ?? message.author;
    const stats  = await StatsModel.findOne({ guildId: guild.id, userId: target.id }).lean() ?? {};
    const perks  = getActivePerks(stats);

    const fields = BADGE_ORDER.map(key => {
      const badge   = BADGES[key];
      const level   = stats.badges?.[key]?.level ?? 0;
      const cost    = nextLevelCost(key, level);
      const stars   = "⬛".repeat(4 - level) + "🟪".repeat(level);
      const perkStr = level > 0 ? `\n*${badge.perks[level - 1]}*` : "";
      const costStr = cost ? `\nNext: 💜 ${cost}` : "\n*MAX LEVEL*";

      return {
        name:  `${badge.emoji} ${badge.name}`,
        value: `${stars} Level ${level}/4${perkStr}${costStr}`,
        inline: true,
      };
    });

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`🏅 Badges — ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(...fields)
      .addFields({
        name: "💜 Kakera",
        value: `${(stats.kakera ?? 0).toLocaleString()}`,
        inline: false,
      })
      .setFooter({ text: "Use $badges buy <badge> to upgrade" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
