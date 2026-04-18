// ============================================================
//  commands/economy/blackjack.js
//  Full interactive blackjack with hit/stand/double
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { ecoCheck }   = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, removeCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, formatNum } = require("../../utils/ecoUtils");
const { createDeck, handTotal, formatHand } = require("../../utils/ecoGamblingUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const eco      = require("../../emojis/ecoemoji");
const gambConf = require("../../ecoconfiguration/gambling");

module.exports = {
  name: "blackjack", description: "Play blackjack!", category: "economy",
  aliases: ["bj", "21"], usage: "<bet>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const bet     = parseInt(ctx.args[0]?.replace(/,/g, ""));
    const cfg     = gambConf.blackjack;
    const profile = await getProfile(client, message.author.id);

    if (!bet || bet < cfg.minBet || bet > cfg.maxBet) return message.reply(`${eco.error} Bet between ${formatNum(cfg.minBet)}-${formatNum(cfg.maxBet)}.`);
    if (bet > profile.wallet) return message.reply(`${eco.error} Not enough coins!`);

    if (!isCooldownReady(profile.cooldowns?.blackjack, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.blackjack, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.cooldown} Wait **${formatCooldown(rem)}**.`)] });
    }

    await removeCoins(client, message.author.id, bet, "blackjack_bet");
    await setCooldown(client, message.author.id, "blackjack");

    const deck       = createDeck();
    let playerHand   = [deck.pop(), deck.pop()];
    const dealerHand = [deck.pop(), deck.pop()];

    const buildEmbed = (status = "playing") => {
      const pTotal = handTotal(playerHand);
      const dTotal = status === "playing" ? "?" : handTotal(dealerHand);
      const color  = status === "win" ? 0x57F287 : status === "lose" ? 0xED4245 : status === "push" ? 0xFEE75C : 0x5865F2;

      return new EmbedBuilder()
        .setColor(color)
        .setTitle(`${eco.blackjack} Blackjack`)
        .addFields(
          { name: `Your Hand (${pTotal})`,  value: formatHand(playerHand),  inline: true },
          { name: `Dealer's Hand (${dTotal})`, value: status === "playing"
            ? `${dealerHand[0].value}${dealerHand[0].suit} | 🂠`
            : formatHand(dealerHand), inline: true },
        )
        .setFooter({ text: `Bet: ${formatNum(bet)} coins` });
    };

    const buildRow = (disabled = false) => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("bj_hit").setLabel("Hit").setStyle(ButtonStyle.Primary).setDisabled(disabled),
      new ButtonBuilder().setCustomId("bj_stand").setLabel("Stand").setStyle(ButtonStyle.Secondary).setDisabled(disabled),
      new ButtonBuilder().setCustomId("bj_double").setLabel("Double Down").setStyle(ButtonStyle.Danger).setDisabled(disabled || profile.wallet < bet),
    );

    // Check for blackjack
    if (handTotal(playerHand) === 21) {
      const payout = Math.floor(bet * cfg.blackjackMultiplier);
      await addCoins(client, message.author.id, payout, "blackjack_bj");
      const UserProfile = client.ecoDb.getModel("Userprofile");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesWon": 1 } });
      await trackWeeklyStat(client, message.author.id, "gamblesWon", 1);
      return message.reply({ embeds: [buildEmbed("win").setDescription(`${eco.jackpot} **BLACKJACK!** Won ${eco.coin} **${formatNum(payout)}**!`)] });
    }

    const msg = await message.reply({ embeds: [buildEmbed()], components: [buildRow()] });

    const filter = i => i.user.id === message.author.id && ["bj_hit","bj_stand","bj_double"].includes(i.customId);
    const coll   = msg.createMessageComponentCollector({ filter, time: cfg.timeoutMs });

    coll.on("collect", async i => {
      await i.deferUpdate();

      if (i.customId === "bj_hit" || i.customId === "bj_double") {
        if (i.customId === "bj_double") {
          await removeCoins(client, message.author.id, bet, "blackjack_double");
        }
        playerHand.push(deck.pop());

        if (handTotal(playerHand) > 21) {
          // Bust
          coll.stop("bust");
          const UserProfile = client.ecoDb.getModel("Userprofile");
          await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesLost": 1 } });
          await msg.edit({ embeds: [buildEmbed("lose").setDescription(`${eco.bust} **Bust!** (${handTotal(playerHand)}) You went over 21.`)], components: [buildRow(true)] });
          return;
        }
        await msg.edit({ embeds: [buildEmbed()], components: [buildRow()] });
        if (i.customId === "bj_double") coll.stop("stand");
      }

      if (i.customId === "bj_stand") coll.stop("stand");
    });

    coll.on("end", async (_, reason) => {
      if (reason === "bust") return;

      // Dealer plays
      while (handTotal(dealerHand) < cfg.dealerStandsAt) dealerHand.push(deck.pop());

      const pTotal = handTotal(playerHand);
      const dTotal = handTotal(dealerHand);
      const UserProfile = client.ecoDb.getModel("Userprofile");

      let status, desc;
      if (dTotal > 21 || pTotal > dTotal) {
        const payout = bet * cfg.multiplier;
        await addCoins(client, message.author.id, payout, "blackjack_win");
        await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesWon": 1 } });
        await trackWeeklyStat(client, message.author.id, "gamblesWon", 1);
        status = "win"; desc = `${eco.success} You win! +${formatNum(payout)} coins`;
      } else if (pTotal === dTotal) {
        await addCoins(client, message.author.id, bet, "blackjack_push");
        status = "push"; desc = `${eco.warning} Push! Bet returned.`;
      } else {
        await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.gamblesLost": 1 } });
        status = "lose"; desc = `${eco.error} Dealer wins. Lost ${formatNum(bet)} coins.`;
      }

      await msg.edit({ embeds: [buildEmbed(status).setDescription(desc)], components: [buildRow(true)] });
    });
  },
};
