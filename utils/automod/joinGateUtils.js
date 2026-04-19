// ============================================================
//  utils/automod/joinGateUtils.js
//  Join gate filter checks
// ============================================================

// ============================================================
//  Check if account is too new
// ============================================================
function isNewAccount(member, minAgeDays) {
  const ageMs  = Date.now() - member.user.createdTimestamp;
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays < minAgeDays;
}

// ============================================================
//  Check if account has no avatar
// ============================================================
function hasNoAvatar(member) {
  return !member.user.avatar;
}

// ============================================================
//  Check if account is suspicious
//  Wick considers: no avatar + new account + default pfp = sus
// ============================================================
function isSuspicious(member) {
  const noAvatar   = !member.user.avatar;
  const ageMs      = Date.now() - member.user.createdTimestamp;
  const ageDays    = ageMs / (1000 * 60 * 60 * 24);
  const newAccount = ageDays < 30;
  const defaultPfp = member.user.defaultAvatarURL === member.user.displayAvatarURL();
  return (noAvatar && newAccount) || (defaultPfp && newAccount && ageDays < 7);
}

// ============================================================
//  Check if username contains invite link
// ============================================================
function hasAdUsername(member) {
  const username = member.user.username.toLowerCase();
  return username.includes("discord.gg") ||
         username.includes("discord.com/invite") ||
         username.includes("discordapp.com/invite");
}

// ============================================================
//  Check if bot is unverified
// ============================================================
function isUnverifiedBot(member) {
  return member.user.bot && !member.user.flags?.has("VerifiedBot");
}

// ============================================================
//  Format account age nicely
// ============================================================
function formatAge(member) {
  const ageMs   = Date.now() - member.user.createdTimestamp;
  const days    = Math.floor(ageMs / 86400000);
  const hours   = Math.floor((ageMs % 86400000) / 3600000);
  if (days >= 1) return `${days}d ${hours}h`;
  return `${hours}h`;
}

module.exports = {
  isNewAccount,
  hasNoAvatar,
  isSuspicious,
  hasAdUsername,
  isUnverifiedBot,
  formatAge,
};
