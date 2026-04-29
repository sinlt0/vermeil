// ============================================================
//  commands/economy/coinflip.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, removeCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, formatNum } = require("../../utils/ecoUtils");
const { flipCoin }     = require("../../utils/ecoGamblingUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const eco      = require("../../emojis/ecoemoji");
const gambConf = require("../../ecoconfiguration/gambling");

module.exports = {
  name: "ecocoinflip", description: "Flip a coin and double your bet!", category: "economy",
  aliases: ["cf"], usage: "<heads|tails|h|t> <bet>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const choice  = ctx.args[0]?.toLowerCase();
    const bet     = parseInt(ctx.args[1]?.replace(/,/g, ""));
    const cfg     = gambConf.coinflip;

    if (!["heads","tails","h","t"].includes(choice)) return message.reply(`${eco.error} Choose \`heads\` or \`tails\`. Example: \`!coinflip heads 500\``);
    if (!bet || bet < cfg.minBet || bet > cfg.maxBet) return message.reply(`${eco.error} Bet must be between ${formatNum(cfg.minBet)} and ${formatNum(cfg.maxBet)}.`);

    const profile = await getProfile(client, message.author.id);
    if (bet > profile.wallet) return message.reply(`${eco.error} Not enough coins!`);

    if (!isCooldownReady(profile.cooldowns?.coinflip, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.coinflip, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.cooldown} Wait **${formatCooldown(rem)}**.`)] });
    }

    const normalChoice = choice === "h" ? "heads" : choice === "t" ? "tails" : choice;
    const result       = flipCoin(normalChoice);

    await setCooldown(client, message.author.id, "coinflip");
    const UserProfile = client.ecoDb.getModel("Userprofile");

    if (result.won) {
      const payout = bet * cfg.multiplier;
      await addCoins(client, message.author.id, bet, "coinflip_win"); // net +bet
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesWon": 1 } });
      await trackWeeklyStat(client, message.author.id, "gamblesWon", 1);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.coinflip} **${result.result.toUpperCase()}!** You won ${eco.coin} **${formatNum(bet)}** coins!`)] });
    } else {
      await removeCoins(client, message.author.id, bet, "coinflip_loss");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesLost": 1 } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.coinflip} **${result.result.toUpperCase()}!** You lost ${eco.coin} **${formatNum(bet)}** coins.`)] });
    }
  },
};
