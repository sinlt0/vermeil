// ============================================================
//  commands/economy/hunt.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { addCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, addXP, formatNum } = require("../../utils/ecoUtils");
const { rollCreature, rarityEmoji, rarityColor, generateCreatureStats } = require("../../utils/ecoHuntUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco        = require("../../emojis/ecoemoji");
const huntConfig = require("../../ecoconfiguration/hunt");
const genConfig  = require("../../ecoconfiguration/general");

module.exports = {
  name: "hunt", description: "Hunt for creatures!", category: "economy",
  aliases: ["h"], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const UserProfile = client.ecoDb.getModel("Userprofile");
    const Creature    = client.ecoDb.getModel("Creature");
    const profile     = await UserProfile.findOne({ userId: message.author.id });

    if (!isCooldownReady(profile.cooldowns?.hunt, huntConfig.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.hunt, huntConfig.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.cooldown} You need to rest! Hunt again in **${formatCooldown(rem)}**.`)] });
    }

    // Check zoo capacity
    const zooCount = await Creature.countDocuments({ userId: message.author.id });
    if (zooCount >= huntConfig.zooCapacity) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.error} Your zoo is full! (${zooCount}/${huntConfig.zooCapacity})\nUse \`!release\` or \`!sacrifice\` to make room.`)] });
    }

    // Roll creature
    const creature = rollCreature(huntConfig);
    const rarity   = huntConfig.rarities.find(r => r.name === creature.rarity);
    const reward   = Math.floor(Math.random() * (rarity.coinReward.max - rarity.coinReward.min + 1)) + rarity.coinReward.min;
    const stats    = generateCreatureStats(creature);

    // Save creature
    await Creature.create({
      userId:     message.author.id,
      creatureId: creature.id,
      name:       creature.name,
      emoji:      creature.emoji,
      rarity:     creature.rarity,
      ...stats,
    });

    await addCoins(client, message.author.id, reward, "hunt");
    await setCooldown(client, message.author.id, "hunt");
    await addXP(client, message.author.id, genConfig.xpRewards.hunt);
    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.huntsTotal": 1, "stats.coinsEarned": reward } });
    await trackWeeklyStat(client, message.author.id, "huntsTotal", 1);
    await trackWeeklyStat(client, message.author.id, "coinsEarned", reward);
    await updateQuestProgress(client, message.author.id, "hunt", 1);
    if (creature.rarity === "legendary") await updateQuestProgress(client, message.author.id, "legendary_hunt", 1);

    // Announce rare drops
    if ((creature.rarity === "epic" || creature.rarity === "legendary") && genConfig.rareDropAnnounce) {
      const ch = genConfig.announcementChannelId ? client.channels.cache.get(genConfig.announcementChannelId) : null;
      if (ch) await ch.send(`${rarityEmoji(creature.rarity)} **${message.author.username}** just caught a **${creature.rarity.toUpperCase()} ${creature.emoji} ${creature.name}**! 🔥`).catch(() => {});
    }

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.hunt} Hunt Result!`)
      .setDescription(
        `${rarityEmoji(creature.rarity)} You caught a **${creature.rarity.toUpperCase()}** ${creature.emoji} **${creature.name}**!\n\n` +
        `${eco.coin} **+${formatNum(reward)} coins**\n\n` +
        `❤️ HP: ${stats.hp} | ⚔️ ATK: ${stats.attack} | 🛡️ DEF: ${stats.defense} | 💨 SPD: ${stats.speed}`
      )
      .setFooter({ text: `Zoo: ${zooCount + 1}/${huntConfig.zooCapacity}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
