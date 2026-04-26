// ============================================================
//  commands/economy/crime.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { addCoins, removeCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, getProfile, addXP, formatNum } = require("../../utils/ecoUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco         = require("../../emojis/ecoemoji");
const crimeConfig = require("../../ecoconfiguration/crime");
const genConfig   = require("../../ecoconfiguration/general");

module.exports = {
  name: "crime", description: "Commit a crime for coins.", category: "economy",
  aliases: ["cr"], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const cfg     = crimeConfig.crime;

    if (!isCooldownReady(profile.cooldowns?.crime, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.crime, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.cooldown} Crime cooldown! Wait **${formatCooldown(rem)}**.`)] });
    }

    await setCooldown(client, message.author.id, "crime");
    const UserProfile = client.ecoDb.getModel("Userprofile");
    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.crimesTotal": 1 } });

    const success = Math.random() < cfg.successRate;

    if (success) {
      const crimeAction = cfg.rewards[Math.floor(Math.random() * cfg.rewards.length)];
      const reward      = Math.floor(Math.random() * (crimeAction.max - crimeAction.min + 1)) + crimeAction.min;

      await addCoins(client, message.author.id, reward, "crime");
      await addXP(client, message.author.id, genConfig.xpRewards.crime);
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.crimesSuccess": 1, "stats.coinsEarned": reward } });
      await trackWeeklyStat(client, message.author.id, "crimesTotal", 1);
      await trackWeeklyStat(client, message.author.id, "coinsEarned", reward);
      await updateQuestProgress(client, message.author.id, "crime", 1);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setTitle(`${eco.crime} Crime Successful!`)
        .setDescription(`${crimeAction.action} and got away with ${eco.coin} **${formatNum(reward)} coins**!`)
        .setTimestamp()] });
    } else {
      const fine       = Math.floor(Math.random() * (cfg.fineOnFail.max - cfg.fineOnFail.min + 1)) + cfg.fineOnFail.min;
      const actualFine = Math.min(fine, profile.wallet);
      if (actualFine > 0) await removeCoins(client, message.author.id, actualFine, "crime_fine");

      const failMsg = cfg.failMessages[Math.floor(Math.random() * cfg.failMessages.length)]
        .replace("{fine}", formatNum(actualFine));

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setTitle(`${eco.caught} Caught!`)
        .setDescription(failMsg)
        .setTimestamp()] });
    }
  },
};
