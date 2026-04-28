// ============================================================
//  utils/collection/rollUtils.js
//  Character rolling logic — weighted random, wishlist boost,
//  claim window, key earnings
// ============================================================
const { fromConnection: Character }       = require("../../models/collection/Character");
const { fromConnection: UserCollection }  = require("../../models/collection/UserCollection");
const { fromConnection: UserStats }       = require("../../models/collection/UserStats");
const { fromConnection: Wishlist }        = require("../../models/collection/Wishlist");
const { fromConnection: CollectionConfig }= require("../../models/collection/CollectionConfig");
const { getActivePerks }                  = require("./badgeUtils");
const { pickKakeraCrystal, calcKakeraValue } = require("./kakera");
const { getCharacterImage }               = require("./imageCache");

// ============================================================
//  Pick a random character for a roll
//  Filter by type, apply wishlist spawn boost
// ============================================================
async function pickCharacter(connection, guildId, userId, rollType = "both") {
  const CharModel   = Character(connection);
  const ConfigModel = CollectionConfig(connection);
  const WLModel     = Wishlist(connection);

  const config = await ConfigModel.findOne({ guildId }).lean()
    ?? { allowWaifu: true, allowHusbando: true, allowAnime: true, allowGame: true };

  // Build filter
  const filter = { enabled: true };
  if (!config.allowNsfw) filter.nsfw = false;

  const typeFilter = [];
  if (rollType === "waifu" || rollType === "both") if (config.allowWaifu)   typeFilter.push("waifu");
  if (rollType === "husbando" || rollType === "both") if (config.allowHusbando) typeFilter.push("husbando");
  if (typeFilter.length) filter.type = { $in: typeFilter };

  const sourceFilter = [];
  if (config.allowAnime)  sourceFilter.push("anime","manga","vn");
  if (config.allowGame)   sourceFilter.push("game");
  if (sourceFilter.length) filter.source = { $in: sourceFilter };

  // Get user wishlist for boost
  const stats = await UserStats(connection).findOne({ guildId, userId }).lean();
  const perks = getActivePerks(stats);
  const wishlist = await WLModel.find({ guildId, userId }).lean();
  const wishedNames = wishlist.map(w => w.name.toLowerCase());

  // Count total matching characters
  const total = await CharModel.countDocuments(filter);
  if (!total) return null;

  // 15% chance to force a wishlist character (if wishlist exists + silver badge)
  if (wishedNames.length && Math.random() < 0.15 * perks.wishlistSpawnMult) {
    const wishedChar = await CharModel.findOne({
      ...filter,
      $or: [
        { name:   { $regex: wishedNames.join("|"), $options: "i" } },
        { series: { $regex: wishlist.filter(w => w.isSeries).map(w => w.name).join("|") || "NOMATCH", $options: "i" } },
      ],
    }).lean();
    if (wishedChar) return wishedChar;
  }

  // Random pick
  const skip = Math.floor(Math.random() * total);
  return CharModel.findOne(filter).skip(skip).lean();
}

// ============================================================
//  Check if a character is owned by anyone in guild
// ============================================================
async function getCharacterOwner(connection, guildId, characterId) {
  const entry = await UserCollection(connection).findOne({ guildId, characterId }).lean();
  return entry ? entry.userId : null;
}

// ============================================================
//  Claim a character for a user
// ============================================================
async function claimCharacter(connection, guildId, userId, character, claimCooldownHrs = 3) {
  const UCollModel  = UserCollection(connection);
  const UStatsModel = UserStats(connection);

  // Double-check not already owned in guild
  const existing = await UCollModel.findOne({ guildId, characterId: character._id }).lean();
  if (existing) return { success: false, reason: "already_claimed", ownerId: existing.userId };

  // Get user stats
  let stats = await UStatsModel.findOne({ guildId, userId });
  if (!stats) stats = await UStatsModel.create({ guildId, userId });

  // Check claim cooldown
  if (stats.claimAvailableAt && new Date(stats.claimAvailableAt) > new Date()) {
    return {
      success: false,
      reason: "cooldown",
      availableAt: stats.claimAvailableAt,
    };
  }

  // Get harem count and check limit
  const config   = await CollectionConfig(connection).findOne({ guildId }).lean();
  const haremCnt = await UCollModel.countDocuments({ guildId, userId });
  if (haremCnt >= (config?.haremLimit ?? 2000)) {
    return { success: false, reason: "harem_full" };
  }

  // Determine position (end of harem)
  const position = haremCnt;

  // Create collection entry
  await UCollModel.create({
    guildId, userId,
    characterId: character._id,
    name:   character.name,
    series: character.series,
    type:   character.type,
    position,
  });

  // Set claim cooldown
  const cooldownMs = claimCooldownHrs * 60 * 60 * 1000;
  await UStatsModel.findOneAndUpdate(
    { guildId, userId },
    { $set: {
        claimAvailableAt: new Date(Date.now() + cooldownMs),
        lastClaimAt:      new Date(),
      },
      $inc: { totalClaims: 1 },
    }
  );

  // Update global claim count
  await Character(connection).findByIdAndUpdate(character._id, { $inc: { globalClaimCount: 1 } });

  return { success: true };
}

// ============================================================
//  Handle key gain when rolling own character
// ============================================================
async function gainKey(connection, guildId, userId, characterId) {
  const UCollModel = UserCollection(connection);
  const entry = await UCollModel.findOne({ guildId, userId, characterId });
  if (!entry) return null;

  // Characters received via trade/gift within 3h can't earn keys
  const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
  if (entry.claimedAt > threeHoursAgo && entry.keys === 0) return null;

  await UCollModel.findByIdAndUpdate(entry._id, { $inc: { keys: 1 } }, { new: true });
  return entry.keys + 1;
}

// ============================================================
//  Get rolls remaining + time until reset
// ============================================================
async function getRollsInfo(connection, guildId, userId) {
  const UStatsModel = UserStats(connection);
  const ConfigModel = CollectionConfig(connection);
  const config  = await ConfigModel.findOne({ guildId }).lean();
  const stats   = await UStatsModel.findOne({ guildId, userId }).lean();

  const baseRolls    = config?.rollsPerReset ?? 10;
  const resetMinutes = config?.rollResetMinutes ?? 60;

  if (!stats) return { rollsLeft: baseRolls, resetAt: null };

  // Check if reset is due
  if (stats.rollsResetAt && new Date(stats.rollsResetAt) <= new Date()) {
    // Reset happened — update in DB and return fresh
    await UStatsModel.findOneAndUpdate(
      { guildId, userId },
      { $set: { rollsLeft: baseRolls, rollsResetAt: new Date(Date.now() + resetMinutes * 60 * 1000) } }
    );
    return { rollsLeft: baseRolls, resetAt: new Date(Date.now() + resetMinutes * 60 * 1000) };
  }

  return {
    rollsLeft: stats.rollsLeft ?? baseRolls,
    resetAt:   stats.rollsResetAt,
  };
}

// ============================================================
//  Use a roll
// ============================================================
async function useRoll(connection, guildId, userId) {
  const info = await getRollsInfo(connection, guildId, userId);
  if (info.rollsLeft <= 0) return false;

  const ConfigModel = CollectionConfig(connection);
  const config      = await ConfigModel.findOne({ guildId }).lean();
  const resetMinutes = config?.rollResetMinutes ?? 60;

  const UStatsModel = UserStats(connection);
  const stats       = await UStatsModel.findOne({ guildId, userId });

  const resetAt = stats?.rollsResetAt ?? new Date(Date.now() + resetMinutes * 60 * 1000);

  await UStatsModel.findOneAndUpdate(
    { guildId, userId },
    {
      $inc: { rollsLeft: -1, rollsUsedTotal: 1 },
      $set: {
        rollsResetAt: !stats?.rollsResetAt ? resetAt : stats.rollsResetAt,
      },
    },
    { upsert: true }
  );
  return true;
}

module.exports = {
  pickCharacter,
  getCharacterOwner,
  claimCharacter,
  gainKey,
  getRollsInfo,
  useRoll,
};
