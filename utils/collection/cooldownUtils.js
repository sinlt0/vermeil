// ============================================================
//  utils/collection/cooldownUtils.js
//  Roll + claim cooldown helpers, time formatting
// ============================================================
const { fromConnection: UserStats } = require("../../models/collection/UserStats");

// ============================================================
//  Format ms remaining as "Xh Xm Xs"
// ============================================================
function formatTimeRemaining(ms) {
  if (ms <= 0) return "Ready!";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec || !parts.length) parts.push(`${sec}s`);
  return parts.join(" ");
}

// ============================================================
//  Get all timers for a user ($tu)
// ============================================================
async function getAllTimers(connection, guildId, userId, config = {}) {
  const stats = await UserStats(connection).findOne({ guildId, userId }).lean();
  const now   = Date.now();

  const claimMs = stats?.claimAvailableAt
    ? Math.max(0, new Date(stats.claimAvailableAt).getTime() - now)
    : 0;

  const rollMs  = stats?.rollsResetAt
    ? Math.max(0, new Date(stats.rollsResetAt).getTime() - now)
    : 0;

  const dailyMs = stats?.dailyAvailableAt
    ? Math.max(0, new Date(stats.dailyAvailableAt).getTime() - now)
    : 0;

  return {
    claim: { ms: claimMs, ready: claimMs === 0, display: formatTimeRemaining(claimMs) },
    rolls: { ms: rollMs,  ready: rollMs  === 0, display: formatTimeRemaining(rollMs), left: stats?.rollsLeft ?? (config?.rollsPerReset ?? 10) },
    daily: { ms: dailyMs, ready: dailyMs === 0, display: formatTimeRemaining(dailyMs) },
  };
}

// ============================================================
//  Check if claim is available
// ============================================================
async function isClaimReady(connection, guildId, userId) {
  const stats = await UserStats(connection).findOne({ guildId, userId }).lean();
  if (!stats?.claimAvailableAt) return { ready: true, ms: 0 };
  const ms = Math.max(0, new Date(stats.claimAvailableAt).getTime() - Date.now());
  return { ready: ms === 0, ms, display: formatTimeRemaining(ms) };
}

// ============================================================
//  Reset claim timer (Emerald badge perk)
// ============================================================
async function resetClaimTimer(connection, guildId, userId, cooldownHours) {
  const stats = await UserStats(connection).findOne({ guildId, userId }).lean();
  const now   = Date.now();

  if (stats?.emeraldResetUsedAt) {
    const cd  = cooldownHours * 60 * 60 * 1000;
    const ms  = Math.max(0, new Date(stats.emeraldResetUsedAt).getTime() + cd - now);
    if (ms > 0) return { success: false, ms, display: formatTimeRemaining(ms) };
  }

  await UserStats(connection).findOneAndUpdate(
    { guildId, userId },
    { $set: { claimAvailableAt: null, emeraldResetUsedAt: new Date() } },
    { upsert: true }
  );

  return { success: true };
}

module.exports = { formatTimeRemaining, getAllTimers, isClaimReady, resetClaimTimer };
