// ============================================================
//  utils/permissions.js
//  Helper functions for permission checks
// ============================================================

/**
 * Check if a user is the bot owner
 */
function isOwner(client, userId) {
  return userId === client.config.ownerID;
}

/**
 * Check if a user is the owner OR a developer
 */
function isDev(client, userId) {
  return isOwner(client, userId) || client.config.devIDs.includes(userId);
}

/**
 * Check if a user can run commands without a prefix
 * Owner is always included
 */
function hasNoPrefix(client, userId) {
  return isOwner(client, userId) || client.config.noPrefix.includes(userId);
}

module.exports = { isOwner, isDev, hasNoPrefix };
