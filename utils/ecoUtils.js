// ============================================================
//  utils/ecoUtils.js
//  Core economy helpers used across ALL economy commands
//  - getProfile / ensureProfile
//  - addCoins / removeCoins / addGems / addTokens
//  - getCooldown / setCooldown / formatCooldown
//  - logTransaction
//  - isEcoReady (check ecoDb available)
//  - ecoReply (prefix-only reply helper)
// ============================================================
const { EmbedBuilder } = require("discord.js");
const eco              = require("../emojis/ecoemoji");

// ============================================================
//  Check if economy system is ready
// ============================================================
function isEcoReady(client) {
  return !!(client.ecoDb?.isReady?.());
}

// ============================================================
//  Prefix-only reply helper for economy commands
// ============================================================
async function ecoReply(message, payload) {
  if (typeof payload === "string") {
    return message.reply({ content: payload });
  }
  return message.reply(payload);
}

// ============================================================
//  Get or create a user profile
// ============================================================
async function getProfile(client, userId) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  if (!UserProfile) return null;
  return UserProfile.findOne({ userId });
}

async function ensureProfile(client, userId, username = null) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  if (!UserProfile) return null;

  let profile = await UserProfile.findOne({ userId });
  if (!profile) {
    profile = await UserProfile.create({ userId, username });
  } else if (username && profile.username !== username) {
    profile.username  = username;
    profile.lastActive = new Date();
    await profile.save();
  }
  return profile;
}

// ============================================================
//  Currency operations
// ============================================================
async function addCoins(client, userId, amount, source = "unknown") {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  const profile     = await UserProfile.findOneAndUpdate(
    { userId },
    {
      $inc: {
        wallet:              amount,
        "stats.coinsEarned": amount > 0 ? amount : 0,
        "stats.coinsSpent":  amount < 0 ? Math.abs(amount) : 0,
      },
      $set: { lastActive: new Date() },
    },
    { new: true }
  );
  if (amount !== 0) await logTransaction(client, userId, source, amount, "coins");
  return profile;
}

async function removeCoins(client, userId, amount, source = "unknown") {
  return addCoins(client, userId, -Math.abs(amount), source);
}

async function addToBank(client, userId, amount) {
  const { defaultLimit } = require("../ecoconfiguration/bank");
  const UserProfile      = client.ecoDb.getModel("Userprofile");
  const profile          = await UserProfile.findOne({ userId });
  if (!profile) return null;

  const limit     = profile.bankLimit ?? defaultLimit;
  const canAdd    = Math.min(amount, limit - profile.bank);
  if (canAdd <= 0) return { profile, added: 0, reason: "Bank is full" };

  profile.bank   += canAdd;
  profile.wallet -= canAdd;
  await profile.save();
  return { profile, added: canAdd };
}

async function withdrawFromBank(client, userId, amount) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  const profile     = await UserProfile.findOne({ userId });
  if (!profile) return null;

  const canWithdraw = Math.min(amount, profile.bank);
  if (canWithdraw <= 0) return { profile, withdrawn: 0, reason: "Bank is empty" };

  profile.bank   -= canWithdraw;
  profile.wallet += canWithdraw;
  await profile.save();
  return { profile, withdrawn: canWithdraw };
}

async function addGems(client, userId, amount) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  return UserProfile.findOneAndUpdate(
    { userId },
    { $inc: { gems: amount, "stats.gemsEarned": amount > 0 ? amount : 0 } },
    { new: true }
  );
}

async function addTokens(client, userId, amount) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  return UserProfile.findOneAndUpdate(
    { userId },
    { $inc: { tokens: amount, "stats.tokensEarned": amount > 0 ? amount : 0 } },
    { new: true }
  );
}

// ============================================================
//  Cooldown management
// ============================================================
async function getCooldown(client, userId, activity) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  const profile     = await UserProfile.findOne({ userId }).select("cooldowns").lean();
  if (!profile) return null;
  return profile.cooldowns?.[activity] ?? null;
}

async function setCooldown(client, userId, activity) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  await UserProfile.findOneAndUpdate(
    { userId },
    { $set: { [`cooldowns.${activity}`]: new Date() } }
  );
}

function isCooldownReady(lastUsed, cooldownMs) {
  if (!lastUsed) return true;
  return Date.now() - new Date(lastUsed).getTime() >= cooldownMs;
}

function getRemainingCooldown(lastUsed, cooldownMs) {
  if (!lastUsed) return 0;
  const elapsed = Date.now() - new Date(lastUsed).getTime();
  return Math.max(0, cooldownMs - elapsed);
}

function formatCooldown(ms) {
  if (ms <= 0) return "ready";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

// ============================================================
//  Log transaction to DB
// ============================================================
async function logTransaction(client, userId, type, amount, currency = "coins", details = null, targetId = null) {
  try {
    const Transaction = client.ecoDb.getModel("Transaction");
    if (!Transaction) return;
    await Transaction.create({ userId, type, amount, currency, details, targetId });
  } catch {}
}

// ============================================================
//  Format numbers nicely
// ============================================================
function formatNum(n) {
  if (n === undefined || n === null) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ============================================================
//  Build standard economy error embed
// ============================================================
function ecoError(msg) {
  return new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.error} ${msg}`);
}

function ecoSuccess(msg) {
  return new EmbedBuilder().setColor(0x57F287).setDescription(`${eco.success} ${msg}`);
}

function ecoInfo(msg, title = null) {
  const e = new EmbedBuilder().setColor(0x5865F2).setDescription(msg);
  if (title) e.setTitle(title);
  return e;
}

// ============================================================
//  Check if user has started (agreed to TOS)
// ============================================================
async function hasStarted(client, userId) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  const profile     = await UserProfile.findOne({ userId }).select("agreedToTos").lean();
  return profile?.agreedToTos === true;
}

// ============================================================
//  Add XP and handle level up
// ============================================================
async function addXP(client, userId, amount) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  const profile     = await UserProfile.findOne({ userId });
  if (!profile) return null;

  profile.xp += amount;
  const needed = Math.floor(100 * Math.pow(1.5, profile.level - 1));

  let leveledUp = false;
  let reward    = 0;

  if (profile.xp >= needed) {
    profile.level++;
    profile.xp    -= needed;
    reward         = profile.level * 500; // configurable bonus per level
    profile.wallet += reward;
    leveledUp       = true;
  }

  await profile.save();
  return { profile, leveledUp, reward, newLevel: profile.level };
}

module.exports = {
  isEcoReady,
  ecoReply,
  getProfile,
  ensureProfile,
  addCoins,
  removeCoins,
  addToBank,
  withdrawFromBank,
  addGems,
  addTokens,
  getCooldown,
  setCooldown,
  isCooldownReady,
  getRemainingCooldown,
  formatCooldown,
  logTransaction,
  formatNum,
  ecoError,
  ecoSuccess,
  ecoInfo,
  hasStarted,
  addXP,
};
