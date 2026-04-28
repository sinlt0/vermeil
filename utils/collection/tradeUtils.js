// ============================================================
//  utils/collection/tradeUtils.js
//  Trade + gift logic
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");
const { fromConnection: TradeSession }   = require("../../models/collection/TradeSession");

// ============================================================
//  Create a trade session
// ============================================================
async function createTrade(connection, guildId, initiatorId, targetId) {
  const TradeModel = TradeSession(connection);

  // Check for existing active trade
  const existing = await TradeModel.findOne({
    guildId,
    $or: [{ initiatorId }, { targetId: initiatorId }],
    status: { $in: ["pending","negotiating"] },
  });
  if (existing) return { success: false, reason: "already_in_trade" };

  const session = await TradeModel.create({
    guildId, initiatorId, targetId,
    status: "pending",
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  return { success: true, session };
}

// ============================================================
//  Add character to trade offer
// ============================================================
async function addToOffer(connection, guildId, userId, sessionId, characterName) {
  const TradeModel = TradeSession(connection);
  const UCollModel = UserCollection(connection);

  const session = await TradeModel.findById(sessionId);
  if (!session || session.guildId !== guildId) return { success: false, reason: "no_session" };
  if (session.status === "completed" || session.status === "cancelled") return { success: false, reason: "session_ended" };

  const isInitiator = session.initiatorId === userId;
  const isTarget    = session.targetId === userId;
  if (!isInitiator && !isTarget) return { success: false, reason: "not_in_trade" };

  // Find the character in user's harem
  const char = await UCollModel.findOne({
    guildId, userId,
    name: { $regex: new RegExp(characterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
  }).lean();

  if (!char) return { success: false, reason: "not_in_harem" };

  const offerField = isInitiator ? "initiatorOffer" : "targetOffer";
  await TradeModel.findByIdAndUpdate(sessionId, {
    $addToSet: {
      [`${offerField}.characterIds`]:   char.characterId,
      [`${offerField}.characterNames`]: char.name,
    },
    $set: { [`${offerField}.confirmed`]: false, status: "negotiating" },
  });

  return { success: true, char };
}

// ============================================================
//  Confirm trade offer
// ============================================================
async function confirmOffer(connection, guildId, userId, sessionId) {
  const TradeModel = TradeSession(connection);
  const session    = await TradeModel.findById(sessionId);
  if (!session) return { success: false, reason: "no_session" };

  const isInitiator = session.initiatorId === userId;
  const isTarget    = session.targetId === userId;
  if (!isInitiator && !isTarget) return { success: false, reason: "not_in_trade" };

  const offerField = isInitiator ? "initiatorOffer" : "targetOffer";
  await TradeModel.findByIdAndUpdate(sessionId, {
    $set: { [`${offerField}.confirmed`]: true },
  });

  // Re-fetch to check if both confirmed
  const updated = await TradeModel.findById(sessionId);
  if (updated.initiatorOffer.confirmed && updated.targetOffer.confirmed) {
    return executeTrade(connection, guildId, updated);
  }

  return { success: true, waiting: true };
}

// ============================================================
//  Execute confirmed trade — swap characters
// ============================================================
async function executeTrade(connection, guildId, session) {
  const UCollModel = UserCollection(connection);
  const TradeModel = TradeSession(connection);

  try {
    // Transfer initiator's chars to target
    for (const charId of session.initiatorOffer.characterIds) {
      await UCollModel.findOneAndUpdate(
        { guildId, userId: session.initiatorId, characterId: charId },
        { $set: { userId: session.targetId, claimedAt: new Date() } }
      );
    }

    // Transfer target's chars to initiator
    for (const charId of session.targetOffer.characterIds) {
      await UCollModel.findOneAndUpdate(
        { guildId, userId: session.targetId, characterId: charId },
        { $set: { userId: session.initiatorId, claimedAt: new Date() } }
      );
    }

    await TradeModel.findByIdAndUpdate(session._id, { $set: { status: "completed" } });
    return { success: true, completed: true };
  } catch (err) {
    await TradeModel.findByIdAndUpdate(session._id, { $set: { status: "cancelled" } });
    return { success: false, reason: err.message };
  }
}

// ============================================================
//  Gift a character (one-way no confirmation needed)
// ============================================================
async function giftCharacter(connection, guildId, senderId, receiverId, characterName) {
  const UCollModel = UserCollection(connection);

  const char = await UCollModel.findOne({
    guildId,
    userId: senderId,
    name: { $regex: new RegExp(characterName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
  });

  if (!char) return { success: false, reason: "not_in_harem" };

  // Reset keys on gift (like Mudae)
  await UCollModel.findByIdAndUpdate(char._id, {
    $set: { userId: receiverId, keys: 0, isFavorite: false, claimedAt: new Date() },
  });

  return { success: true, char };
}

module.exports = { createTrade, addToOffer, confirmOffer, giftCharacter };
