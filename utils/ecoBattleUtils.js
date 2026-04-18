// ============================================================
//  utils/ecoBattleUtils.js
//  Battle system — turn-based combat logic
// ============================================================
const eco = require("../emojis/ecoemoji");

// ============================================================
//  Simulate a full battle between two teams
//  Returns winner, log, rounds
// ============================================================
function simulateBattle(teamA, teamB) {
  const log    = [];
  let roundNum = 0;
  const MAX_ROUNDS = 20;

  // Deep clone to avoid mutating DB docs
  const a = teamA.map(c => ({ ...c, currentHp: c.hp }));
  const b = teamB.map(c => ({ ...c, currentHp: c.hp }));

  while (roundNum < MAX_ROUNDS) {
    roundNum++;

    // Determine who goes first by speed
    const allCreatures = [
      ...a.map(c => ({ ...c, team: "A" })),
      ...b.map(c => ({ ...c, team: "B" })),
    ].sort((x, y) => y.speed - x.speed);

    let roundLog = `**Round ${roundNum}**\n`;

    for (const attacker of allCreatures) {
      if (attacker.currentHp <= 0) continue;

      const defenders = attacker.team === "A"
        ? b.filter(c => c.currentHp > 0)
        : a.filter(c => c.currentHp > 0);

      if (!defenders.length) break;

      // Target lowest HP
      const target  = defenders.reduce((min, c) => c.currentHp < min.currentHp ? c : min);
      const damage  = Math.max(1, attacker.attack - Math.floor(target.defense * 0.5));
      target.currentHp -= damage;

      roundLog += `${attacker.emoji ?? eco.paw} **${attacker.name}** → ${target.emoji ?? eco.paw} **${target.name}** \`-${damage} HP\`\n`;

      if (target.currentHp <= 0) {
        roundLog += `${eco.lose} **${target.name}** fainted!\n`;
      }
    }

    log.push(roundLog);

    // Check win conditions
    const aAlive = a.filter(c => c.currentHp > 0).length;
    const bAlive = b.filter(c => c.currentHp > 0).length;

    if (aAlive === 0 && bAlive === 0) return { winner: "draw", log, rounds: roundNum };
    if (aAlive === 0) return { winner: "B", log, rounds: roundNum };
    if (bAlive === 0) return { winner: "A", log, rounds: roundNum };
  }

  // Tiebreak by total remaining HP
  const aHp = a.reduce((s, c) => s + Math.max(0, c.currentHp), 0);
  const bHp = b.reduce((s, c) => s + Math.max(0, c.currentHp), 0);
  return { winner: aHp >= bHp ? "A" : "B", log, rounds: roundNum };
}

// ============================================================
//  Calculate XP gained from battle
// ============================================================
function calcBattleXp(opponentTeam, won) {
  const baseXp = opponentTeam.reduce((s, c) => {
    const mult = { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12 };
    return s + (10 * (mult[c.rarity] ?? 1));
  }, 0);
  return won ? baseXp : Math.floor(baseXp * 0.3);
}

module.exports = { simulateBattle, calcBattleXp };
