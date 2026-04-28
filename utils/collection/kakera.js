// ============================================================
//  utils/collection/kakera.js
//  Kakera values, crystal colors, react power, daily rewards
// ============================================================

// ── Crystal colors and values ─────────────────────────────
const KAKERA_CRYSTALS = [
  { color: "purple",  emoji: "💜", min: 100,  max: 100,  power: 0   }, // free
  { color: "blue",    emoji: "💙", min: 101,  max: 150,  power: 100 },
  { color: "teal",    emoji: "🩵", min: 171,  max: 220,  power: 100 },
  { color: "green",   emoji: "💚", min: 251,  max: 300,  power: 100 },
  { color: "yellow",  emoji: "💛", min: 401,  max: 500,  power: 100 },
  { color: "orange",  emoji: "🧡", min: 701,  max: 800,  power: 100 },
  { color: "red",     emoji: "❤️",  min: 1401, max: 1500, power: 100 },
  { color: "rainbow", emoji: "🌈", min: 3001, max: 3100, power: 100 },
  { color: "light",   emoji: "🤍", min: 0,    max: 0,    power: 100, isLight: true },
];

// ── Daily kakera tiers ────────────────────────────────────
const DAILY_TIERS = [
  { min: 150, max: 270, chance: 0.807 },
  { min: 300, max: 419, chance: 0.155 },
  { min: 700, max: 820, chance: 0.030 },
  { min: 1500, max: 2000, chance: 0.008 },
];

// ── Kakera react power ────────────────────────────────────
const POWER_REGEN_RATE  = 1;         // % per 3 minutes
const POWER_REGEN_MS    = 3 * 60 * 1000;

// ============================================================
//  Calculate character kakera value based on claim/like rank
// ============================================================
function calcKakeraValue(character, claimRank, likeRank, totalClaimed, keys = 0) {
  let base = character.baseKakera ?? 50;

  // Claim rank boost (top 1000 = bonus)
  if (claimRank <= 100)   base = Math.max(base, 3000);
  else if (claimRank <= 500)  base = Math.max(base, 1500);
  else if (claimRank <= 1000) base = Math.max(base, 800);
  else if (claimRank <= 5000) base = Math.max(base, 400);
  else if (claimRank <= 10000) base = Math.max(base, 200);
  else base = Math.max(base, 50);

  // Scale with total claimed in server (more claimed = more valuable)
  const claimedMultiplier = 1 + (totalClaimed / 10000) * 0.5;
  base = Math.floor(base * claimedMultiplier);

  // Key bonus: each key adds kakera value
  if (keys >= 10) base = Math.floor(base * 1.5);
  else if (keys >= 5) base = Math.floor(base * 1.2);

  return Math.max(base, 30);
}

// ============================================================
//  Pick which kakera crystal spawns on a roll
// ============================================================
function pickKakeraCrystal(keys = 0, hasSapphireIV = false) {
  // Higher keys = better kakera
  let pool = [...KAKERA_CRYSTALS.filter(c => !c.isLight)];

  // Silver key+: teal/green → orange
  if (keys >= 2) {
    pool = pool.map(c =>
      ["teal","green"].includes(c.color) ? KAKERA_CRYSTALS.find(x => x.color === "orange") : c
    );
  }

  // Sapphire IV: blue → yellow
  if (hasSapphireIV) {
    pool = pool.map(c => c.color === "blue" ? KAKERA_CRYSTALS.find(x => x.color === "yellow") : c);
  }

  // Weighted random based on keys
  const weights = pool.map(c => {
    if (c.color === "purple")  return 30;
    if (c.color === "blue")    return keys >= 3 ? 5 : 25;
    if (c.color === "teal")    return keys >= 3 ? 20 : 15;
    if (c.color === "green")   return keys >= 5 ? 20 : 10;
    if (c.color === "yellow")  return keys >= 5 ? 20 : 8;
    if (c.color === "orange")  return keys >= 10 ? 20 : 5;
    if (c.color === "red")     return keys >= 15 ? 15 : 2;
    if (c.color === "rainbow") return keys >= 25 ? 10 : 1;
    return 5;
  });

  const total = weights.reduce((a, b) => a + b, 0);
  let rand    = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    rand -= weights[i];
    if (rand <= 0) {
      const crystal = pool[i];
      // Light kakera rare chance
      if (Math.random() < 0.02) return { ...KAKERA_CRYSTALS.find(c => c.isLight), isLight: true };
      const value = Math.floor(Math.random() * (crystal.max - crystal.min + 1)) + crystal.min;
      return { ...crystal, value };
    }
  }
  return { ...pool[0], value: pool[0].min };
}

// ============================================================
//  Light kakera: breaks into 3-4 random crystals
// ============================================================
function breakLightKakera() {
  const count   = Math.floor(Math.random() * 2) + 3; // 3-4 crystals
  const results = [];
  const eligible = KAKERA_CRYSTALS.filter(c => !c.isLight && c.color !== "rainbow");
  for (let i = 0; i < count; i++) {
    const crystal = eligible[Math.floor(Math.random() * eligible.length)];
    const value   = Math.floor(Math.random() * (crystal.max - crystal.min + 1)) + crystal.min;
    results.push({ ...crystal, value });
  }
  return results;
}

// ============================================================
//  Daily kakera reward
// ============================================================
function rollDailyKakera(mudapinCount = 0) {
  const rand = Math.random();
  let cumulative = 0;
  for (const tier of DAILY_TIERS) {
    cumulative += tier.chance;
    if (rand <= cumulative) {
      const base    = Math.floor(Math.random() * (tier.max - tier.min + 1)) + tier.min;
      return base + mudapinCount;
    }
  }
  return DAILY_TIERS[0].min + mudapinCount;
}

// ============================================================
//  Lazy regen kakera react power
// ============================================================
function calcReactPower(currentPower, lastRegenTime) {
  const elapsed = Date.now() - new Date(lastRegenTime).getTime();
  const periods = Math.floor(elapsed / POWER_REGEN_MS);
  return Math.min(100, currentPower + periods * POWER_REGEN_RATE);
}

module.exports = {
  KAKERA_CRYSTALS,
  DAILY_TIERS,
  calcKakeraValue,
  pickKakeraCrystal,
  breakLightKakera,
  rollDailyKakera,
  calcReactPower,
};
