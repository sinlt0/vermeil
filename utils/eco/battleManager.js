// ============================================================
//  utils/eco/battleManager.js
//  PvP battle challenge system
//  Stores pending challenges in memory
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const eco               = require("../../emojis/ecoemoji");
const { formatNum }     = require("../ecoUtils");
const { simulateBattle, calcBattleXp } = require("../ecoBattleUtils");
const battleConfig      = require("../../ecoconfiguration/battle");

// In-memory challenge store: challengeId → challenge data
const activeChallenges = new Map();

// ============================================================
//  Issue a PvP challenge
// ============================================================
async function issuePvpChallenge(client, message, challenger, target, wager = 0) {
  const challengeId = `${message.guild.id}_${challenger.id}_${target.id}`;

  if (activeChallenges.has(challengeId)) {
    return message.reply(`${eco.error} You already have a pending challenge against this user!`);
  }

  const challenge = {
    id:          challengeId,
    challengerId: challenger.id,
    targetId:    target.id,
    guildId:     message.guild.id,
    channelId:   message.channel.id,
    wager,
    msgId:       null,
    createdAt:   Date.now(),
  };

  activeChallenges.set(challengeId, challenge);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${eco.battle} Battle Challenge!`)
    .setDescription(
      `<@${challenger.id}> has challenged <@${target.id}> to a battle!\n\n` +
      (wager > 0 ? `**Wager:** ${formatNum(wager)} ${eco.coin}\n\n` : "") +
      `<@${target.id}>, click **Accept** to fight!`
    )
    .setFooter({ text: `Challenge expires in ${battleConfig.challengeTimeoutMs / 1000}s` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`battle_accept_${challengeId}`).setLabel("Accept").setStyle(ButtonStyle.Success).setEmoji(eco.battle),
    new ButtonBuilder().setCustomId(`battle_decline_${challengeId}`).setLabel("Decline").setStyle(ButtonStyle.Danger),
  );

  const msg = await message.channel.send({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
  challenge.msgId = msg.id;

  // Auto-expire
  setTimeout(async () => {
    if (!activeChallenges.has(challengeId)) return;
    activeChallenges.delete(challengeId);
    await msg.edit({ embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription(`${eco.error} Battle challenge expired.`)], components: [] }).catch(() => {});
  }, battleConfig.challengeTimeoutMs);

  return msg;
}

// ============================================================
//  Execute PvP battle
// ============================================================
async function executePvpBattle(client, challengeId, msg) {
  const challenge = activeChallenges.get(challengeId);
  if (!challenge) return;
  activeChallenges.delete(challengeId);

  const Creature    = client.ecoDb.getModel("Creature");
  const UserProfile = client.ecoDb.getModel("Userprofile");

  // Get teams
  const teamA = await Creature.find({ userId: challenge.challengerId, isTeam: true }).lean();
  const teamB = await Creature.find({ userId: challenge.targetId,    isTeam: true }).lean();

  if (!teamA.length || !teamB.length) {
    await msg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.error} Both players need at least 1 creature in their team! Use \`!team add\` to set your team.`)], components: [] }).catch(() => {});
    return;
  }

  const result = simulateBattle(teamA, teamB);

  const winnerId = result.winner === "A" ? challenge.challengerId : result.winner === "B" ? challenge.targetId : null;
  const loserId  = result.winner === "A" ? challenge.targetId    : result.winner === "B" ? challenge.challengerId : null;

  // Rewards
  const winCoins = Math.floor(Math.random() * (battleConfig.pvp.winnerCoins.max - battleConfig.pvp.winnerCoins.min + 1)) + battleConfig.pvp.winnerCoins.min;
  const winXp    = battleConfig.pvp.winnerXp;
  const loseXp   = battleConfig.pvp.loserXp;

  if (winnerId) {
    const totalWin = winCoins + (challenge.wager * 2);
    await UserProfile.findOneAndUpdate({ userId: winnerId }, { $inc: { wallet: totalWin, xp: winXp, "stats.battlesWon": 1, "stats.coinsEarned": totalWin } });
    if (challenge.wager > 0) {
      await UserProfile.findOneAndUpdate({ userId: loserId }, { $inc: { wallet: -challenge.wager, xp: loseXp, "stats.battlesLost": 1 } });
    } else {
      await UserProfile.findOneAndUpdate({ userId: loserId }, { $inc: { xp: loseXp, "stats.battlesLost": 1 } });
    }
  }

  // Build result embed — show last 3 rounds only to avoid too long
  const shownLog = result.log.slice(-3).join("\n");

  const embed = new EmbedBuilder()
    .setColor(winnerId ? 0x57F287 : 0x99AAB5)
    .setTitle(`${eco.battle} Battle Result`)
    .setDescription(shownLog)
    .addFields(
      { name: "Winner", value: winnerId ? `<@${winnerId}>` : "Draw!", inline: true },
      { name: "Rounds", value: `${result.rounds}`,                   inline: true },
      ...(winnerId ? [{ name: "Reward", value: `${formatNum(winCoins)} ${eco.coin}`, inline: true }] : []),
    )
    .setTimestamp();

  await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
}

function getChallenge(challengeId) { return activeChallenges.get(challengeId) ?? null; }
function deleteChallenge(challengeId) { activeChallenges.delete(challengeId); }

module.exports = { issuePvpChallenge, executePvpBattle, getChallenge, deleteChallenge };
