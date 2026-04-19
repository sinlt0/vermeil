// ============================================================
//  utils/automod/mentionDetector.js
//  Mention counting and @everyone detection
// ============================================================

// ============================================================
//  Count user mentions in message (excluding bots)
// ============================================================
function countUserMentions(message) {
  return message.mentions.users.filter(u => !u.bot).size;
}

// ============================================================
//  Count role mentions in message
// ============================================================
function countRoleMentions(message) {
  return message.mentions.roles.size;
}

// ============================================================
//  Check for @everyone / @here
// ============================================================
function hasEveryoneMention(message) {
  return message.mentions.everyone;
}

// ============================================================
//  Check if a role mention is a "main" (public) role
// ============================================================
function mentionsMainRole(message, mainRoleIds = []) {
  if (!mainRoleIds.length) return false;
  return message.mentions.roles.some(r => mainRoleIds.includes(r.id));
}

// ============================================================
//  Get mention heat based on type and count
// ============================================================
function getMentionHeat(message, mainRoleIds = []) {
  const results = [];

  if (hasEveryoneMention(message)) {
    results.push({ type: "@everyone/@here Mention", heat: 100 });
    return results; // instant trigger — no need to check more
  }

  const userCount = countUserMentions(message);
  const roleCount = countRoleMentions(message);
  const total     = userCount + roleCount;

  if (mentionsMainRole(message, mainRoleIds)) {
    results.push({ type: "Main Role Mention", heat: 80 });
  }

  if (roleCount >= 2) {
    results.push({ type: "Role Mention Spam", heat: 45 * roleCount });
  }

  if (userCount >= 5) {
    results.push({ type: "User Mention Spam", heat: 10 * userCount });
  } else if (userCount >= 3) {
    results.push({ type: "Multiple User Mentions", heat: 30 });
  }

  return results;
}

module.exports = {
  countUserMentions,
  countRoleMentions,
  hasEveryoneMention,
  mentionsMainRole,
  getMentionHeat,
};
