// ============================================================
//  commands/economy/rob.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, removeCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, formatNum } = require("../../utils/ecoUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco        = require("../../emojis/ecoemoji");
const crimeConfig = require("../../ecoconfiguration/crime");

module.exports = {
  name: "rob", description: "Attempt to rob another user's wallet.", category: "economy",
  aliases: ["steal"], usage: "<@user>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target = message.mentions.users.first();
    if (!target) return message.reply(`${eco.error} Mention a user to rob! \`!rob @user\``);
    if (target.id === message.author.id) return message.reply(`${eco.error} You can't rob yourself!`);
    if (target.bot) return message.reply(`${eco.error} You can't rob a bot!`);

    const robberProfile = await getProfile(client, message.author.id);
    const victimProfile = await getProfile(client, target.id);
    const cfg           = crimeConfig.rob;

    if (!victimProfile?.agreedToTos) return message.reply(`${eco.error} That user hasn't started the economy yet!`);

    if (!isCooldownReady(robberProfile.cooldowns?.rob, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(robberProfile.cooldowns?.rob, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.cooldown} Rob cooldown! Wait **${formatCooldown(rem)}**.`)] });
    }

    // Check protection
    if (victimProfile.robProtection) {
      await setCooldown(client, message.author.id, "rob");
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.protect} **${target.username}** is protected from robbery! Your attempt was logged.`)] });
    }

    // Check min wallet
    if (victimProfile.wallet < cfg.minWalletToRob) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.error} **${target.username}** doesn't have enough coins in their wallet. (Min: ${formatNum(cfg.minWalletToRob)})`)] });
    }

    await setCooldown(client, message.author.id, "rob");

    const UserProfile = client.ecoDb.getModel("Userprofile");
    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.robsTotal": 1 } });

    const success = Math.random() < cfg.successRate;

    if (success) {
      const pct    = cfg.robPercent.min + Math.random() * (cfg.robPercent.max - cfg.robPercent.min);
      const stolen = Math.floor(victimProfile.wallet * pct);

      await addCoins(client, message.author.id, stolen, "rob_success");
      await removeCoins(client, target.id, stolen, "robbed");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.robsSuccess": 1 } });
      await trackWeeklyStat(client, message.author.id, "robsSuccess", 1);
      await updateQuestProgress(client, message.author.id, "rob", 1);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setTitle(`${eco.rob} Robbery Successful!`)
        .setDescription(`You stole ${eco.coin} **${formatNum(stolen)} coins** from **${target.username}**!`)
        .setTimestamp()] });
    } else {
      const fine = Math.floor(Math.random() * (cfg.fineOnFail.max - cfg.fineOnFail.min + 1)) + cfg.fineOnFail.min;
      const actualFine = Math.min(fine, robberProfile.wallet);
      if (actualFine > 0) {
        await removeCoins(client, message.author.id, actualFine, "rob_fine");
        await addCoins(client, target.id, actualFine, "rob_fine_received");
      }

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setTitle(`${eco.caught} Caught!`)
        .setDescription(`You were caught trying to rob **${target.username}**!\nFined ${eco.coin} **${formatNum(actualFine)} coins** which was given to the victim.`)
        .setTimestamp()] });
    }
  },
};
