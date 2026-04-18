// ============================================================
//  utils/ecoHuntUtils.js
//  Hunt system — creature generation + catch logic
// ============================================================
const eco = require("../emojis/ecoemoji");

// ============================================================
//  Pick a creature based on rarity weights
// ============================================================
function rollCreature(huntConfig) {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const rarity of huntConfig.rarities) {
    cumulative += rarity.chance;
    if (roll <= cumulative) {
      const pool     = huntConfig.creatures.filter(c => c.rarity === rarity.name);
      const creature = pool[Math.floor(Math.random() * pool.length)];
      return { ...creature, rarity: rarity.name };
    }
  }

  // Fallback to common
  const commons = huntConfig.creatures.filter(c => c.rarity === "common");
  return { ...commons[Math.floor(Math.random() * commons.length)], rarity: "common" };
}

// ============================================================
//  Get rarity emoji
// ============================================================
function rarityEmoji(rarity) {
  const map = {
    common:    eco.common,
    uncommon:  eco.uncommon,
    rare:      eco.rare,
    epic:      eco.epic,
    legendary: eco.legendary,
  };
  return map[rarity] ?? eco.common;
}

// ============================================================
//  Get rarity color
// ============================================================
function rarityColor(rarity) {
  const map = {
    common:    0x99AAB5,
    uncommon:  0x57F287,
    rare:      0x5865F2,
    epic:      0x9B59B6,
    legendary: 0xFEE75C,
  };
  return map[rarity] ?? 0x99AAB5;
}

// ============================================================
//  Generate base stats for a caught creature
// ============================================================
function generateCreatureStats(creature) {
  const rarityMult = { common: 1, uncommon: 1.3, rare: 1.7, epic: 2.2, legendary: 3 };
  const mult = rarityMult[creature.rarity] ?? 1;
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  return {
    hp:      Math.floor(rand(80, 120)  * mult),
    attack:  Math.floor(rand(8,  15)   * mult),
    defense: Math.floor(rand(3,  10)   * mult),
    speed:   Math.floor(rand(3,  10)   * mult),
  };
}

module.exports = { rollCreature, rarityEmoji, rarityColor, generateCreatureStats };
