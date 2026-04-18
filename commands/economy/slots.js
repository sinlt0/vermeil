// ============================================================
//  commands/economy/slots.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, removeCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, formatNum } = require("../../utils/ecoUtils");
const { spinSlots, calcSlotPayout } = require("../../utils/ecoGamblingUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const eco      = require("../../emojis/ecoemoji");
const gambConf = require("../../ecoconfiguration/gambling");

module.exports = {
  name: "slots", description: "Spin the slot machine!", category: "economy",
  aliases: ["slot", "spin"], usage: "<bet>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const cfg     = gambConf.slots;
    const bet     = parseInt(ctx.args[0]?.replace(/,/g, ""));

    if (!bet || bet < cfg.minBet || bet > cfg.maxBet) return message.reply(`${eco.error} Bet must be between ${formatNum(cfg.minBet)} and ${formatNum(cfg.maxBet)} coins.`);
    if (bet > profile.wallet) return message.reply(`${eco.error} You don't have enough coins!`);

    if (!isCooldownReady(profile.cooldowns?.slots, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.slots, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.cooldown} Wait **${formatCooldown(rem)}**.`)] });
    }

    await removeCoins(client, message.author.id, bet, "slots_bet");
    await setCooldown(client, message.author.id, "slots");

    const reels  = spinSlots();
    const result = calcSlotPayout(reels, bet);

    const UserProfile = client.ecoDb.getModel("Userprofile");

    if (result.won) {
      await addCoins(client, message.author.id, result.payout, "slots_win");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesWon": 1, "stats.coinsEarned": result.payout } });
      await trackWeeklyStat(client, message.author.id, "gamblesWon", 1);
    } else {
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesLost": 1 } });
    }

    const net   = result.won ? result.payout - bet : -bet;
    const color = result.won ? 0x57F287 : 0xED4245;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${eco.slots} Slot Machine`)
      .setDescription(
        `**[ ${reels.join(" | ")} ]**\n\n` +
        (result.won
          ? `${result.type === "JACKPOT" ? `${eco.jackpot} **JACKPOT!**` : `${eco.success} **Match!**`} Won ${eco.coin} **${formatNum(result.payout)}** (${result.multiplier}x)\nNet: **+${formatNum(net)}**`
          : `${eco.error} No match. Lost ${eco.coin} **${formatNum(bet)}**`)
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
