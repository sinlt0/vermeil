// ============================================================
//  commands/economy/daily.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, addXP, formatNum } = require("../../utils/ecoUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco       = require("../../emojis/ecoemoji");
const genConfig = require("../../ecoconfiguration/general");

module.exports = {
  name: "daily", description: "Claim your daily reward.", category: "economy",
  aliases: ["day"], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const cfg     = genConfig.daily;

    if (!isCooldownReady(profile.cooldowns?.daily, cfg.cooldownMs)) {
      const remaining = getRemainingCooldown(profile.cooldowns?.daily, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setDescription(`${eco.cooldown} Your daily is on cooldown! Come back in **${formatCooldown(remaining)}**.`)] });
    }

    // Calculate reward
    const reward = cfg.base;
    let bonusMsg = "";

    // Gem chance
    if (Math.random() < cfg.gemChance) {
      await addCoins(client, message.author.id, reward, "daily");
      const UserProfile = client.ecoDb.getModel("Userprofile");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { gems: cfg.gemAmount } });
      bonusMsg = `\n${eco.gem} **Bonus:** ${cfg.gemAmount} gem!`;
    } else {
      await addCoins(client, message.author.id, reward, "daily");
    }

    await setCooldown(client, message.author.id, "daily");
    await addXP(client, message.author.id, genConfig.xpRewards.daily);
    await trackWeeklyStat(client, message.author.id, "coinsEarned", reward);
    await updateQuestProgress(client, message.author.id, "daily", 1);

    const UserProfile = client.ecoDb.getModel("Userprofile");
    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.dailyClaimed": 1 } });

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${eco.daily} Daily Reward!`)
      .setDescription(`${eco.coin} You received **${formatNum(reward)} coins**!${bonusMsg}`)
      .setFooter({ text: `Come back tomorrow for your next daily!` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
