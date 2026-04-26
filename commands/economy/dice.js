// ============================================================
//  commands/economy/dice.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, removeCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, formatNum } = require("../../utils/ecoUtils");
const { rollDice }     = require("../../utils/ecoGamblingUtils");
const eco      = require("../../emojis/ecoemoji");
const gambConf = require("../../ecoconfiguration/gambling");

module.exports = {
  name: "dice", description: "Roll the dice! Guess the exact number or high/low.", category: "economy",
  aliases: ["roll"], usage: "<number|high|low> <bet>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const guess = ctx.args[0]?.toLowerCase();
    const bet   = parseInt(ctx.args[1]?.replace(/,/g, ""));
    const cfg   = gambConf.dice;

    if (!guess || !bet) return message.reply(`${eco.error} Usage: \`!dice <1-6|high|low> <bet>\``);
    if (bet < cfg.minBet || bet > cfg.maxBet) return message.reply(`${eco.error} Bet between ${formatNum(cfg.minBet)}-${formatNum(cfg.maxBet)}.`);

    const profile = await getProfile(client, message.author.id);
    if (bet > profile.wallet) return message.reply(`${eco.error} Not enough coins!`);

    if (!isCooldownReady(profile.cooldowns?.dice, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.dice, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.cooldown} Wait **${formatCooldown(rem)}**.`)] });
    }

    const rolled = rollDice(cfg.sides);
    await setCooldown(client, message.author.id, "dice");
    await removeCoins(client, message.author.id, bet, "dice_bet");

    let won = false, multiplier = 1;
    if (!isNaN(parseInt(guess))) {
      won = parseInt(guess) === rolled;
      multiplier = cfg.winMultiplier;
    } else if (guess === "high") {
      won = rolled >= 4;
      multiplier = cfg.highLowMultiplier;
    } else if (guess === "low") {
      won = rolled <= 3;
      multiplier = cfg.highLowMultiplier;
    } else {
      return message.reply(`${eco.error} Guess must be a number 1-6, or "high"/"low".`);
    }

    const UserProfile = client.ecoDb.getModel("Userprofile");
    if (won) {
      const payout = Math.floor(bet * multiplier);
      await addCoins(client, message.author.id, payout, "dice_win");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesWon": 1 } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.dice} Rolled **${rolled}**! You guessed correctly and won ${eco.coin} **${formatNum(payout)}**!`)] });
    } else {
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesLost": 1 } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.dice} Rolled **${rolled}**! You guessed ${guess} and lost ${eco.coin} **${formatNum(bet)}**.`)] });
    }
  },
};
