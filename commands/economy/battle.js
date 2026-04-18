// ============================================================
//  commands/economy/battle.js
//  Challenge another user to PvP or fight wild (PvE)
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { isCooldownReady, getRemainingCooldown, formatCooldown, addCoins, addXP, formatNum, setCooldown } = require("../../utils/ecoUtils");
const { issuePvpChallenge } = require("../../utils/eco/battleManager");
const { rollCreature, generateCreatureStats } = require("../../utils/ecoHuntUtils");
const { simulateBattle, calcBattleXp } = require("../../utils/ecoBattleUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco           = require("../../emojis/ecoemoji");
const battleConfig  = require("../../ecoconfiguration/battle");
const huntConfig    = require("../../ecoconfiguration/hunt");
const genConfig     = require("../../ecoconfiguration/general");

module.exports = {
  name: "battle", description: "Battle another player or a wild creature.", category: "economy",
  aliases: ["fight", "b"], usage: "[@user] [wager]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const UserProfile = client.ecoDb.getModel("Userprofile");
    const profile     = await UserProfile.findOne({ userId: message.author.id });

    if (!isCooldownReady(profile.cooldowns?.battle, battleConfig.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.battle, battleConfig.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setDescription(`${eco.cooldown} Battle cooldown! Wait **${formatCooldown(rem)}**.`)] });
    }

    const targetUser = message.mentions.users.first();

    // ── PvP ───────────────────────────────────────────
    if (targetUser) {
      if (targetUser.id === message.author.id) return message.reply(`${eco.error} You can't battle yourself!`);
      if (targetUser.bot) return message.reply(`${eco.error} You can't battle a bot!`);

      const wager = parseInt(ctx.args[1]?.replace(/,/g, "")) || 0;
      if (wager > 0) {
        if (wager > battleConfig.pvp.wagerMax) return message.reply(`${eco.error} Max wager is ${formatNum(battleConfig.pvp.wagerMax)} coins.`);
        if (wager < battleConfig.pvp.wagerMin) return message.reply(`${eco.error} Min wager is ${formatNum(battleConfig.pvp.wagerMin)} coins.`);
        if (profile.wallet < wager) return message.reply(`${eco.error} You don't have enough coins for that wager!`);
        if (wager > 0) await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { wallet: -wager } });
      }

      await setCooldown(client, message.author.id, "battle");
      return issuePvpChallenge(client, message, message.member, targetUser, wager);
    }

    // ── PvE (wild battle) ─────────────────────────────
    const Creature  = client.ecoDb.getModel("Creature");
    const teamA     = await Creature.find({ userId: message.author.id, isTeam: true }).lean();

    if (!teamA.length) return message.reply(`${eco.error} You need creatures in your team! Use \`!team add <position>\` to add creatures.`);

    // Generate wild enemy team
    const wildCreature = rollCreature(huntConfig);
    const wildStats    = generateCreatureStats(wildCreature);
    const teamB        = [{ ...wildCreature, ...wildStats, currentHp: wildStats.hp }];

    const result = simulateBattle(teamA, teamB);
    const won    = result.winner === "A";

    const cfg     = battleConfig.pve;
    const reward  = won ? Math.floor(Math.random() * (cfg.winnerCoins.max - cfg.winnerCoins.min + 1)) + cfg.winnerCoins.min : 0;
    const xp      = won ? cfg.winnerXp : cfg.loseXp;

    if (reward > 0) await addCoins(client, message.author.id, reward, "battle_pve");
    await addXP(client, message.author.id, xp + genConfig.xpRewards.battle);
    await setCooldown(client, message.author.id, "battle");

    if (won) {
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.battlesWon": 1, "stats.coinsEarned": reward } });
      await trackWeeklyStat(client, message.author.id, "battlesWon", 1);
      await updateQuestProgress(client, message.author.id, "battle", 1);
    } else {
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.battlesLost": 1 } });
    }

    const shownLog = result.log.slice(-2).join("\n");
    const embed = new EmbedBuilder()
      .setColor(won ? 0x57F287 : 0xED4245)
      .setTitle(`${eco.battle} Wild Battle — ${won ? "Victory!" : "Defeat!"}`)
      .setDescription(
        `You battled a wild ${wildCreature.emoji} **${wildCreature.name}**!\n\n` +
        shownLog +
        (reward > 0 ? `\n\n${eco.coin} **+${formatNum(reward)} coins**` : "")
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
