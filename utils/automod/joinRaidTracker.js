// ============================================================
//  utils/automod/joinRaidTracker.js
//  In-memory join tracking + raid detection
// ============================================================
const { EmbedBuilder } = require("discord.js");
const e = require("../../emojis/automodemoji");

// Map<guildId, [{ userId, timestamp }]>
const joinTracker = new Map();

// ============================================================
//  Record a join and check if raid threshold hit
//  Returns { triggered, count, windowHours }
// ============================================================
function trackJoin(guildId, userId, config) {
  const now        = Date.now();
  const windowMs   = (config.windowHours ?? 1) * 60 * 60 * 1000;
  const threshold  = config.threshold ?? 10;

  if (!joinTracker.has(guildId)) joinTracker.set(guildId, []);

  // Filter to window
  const joins = joinTracker.get(guildId).filter(j => now - j.timestamp < windowMs);
  joins.push({ userId, timestamp: now });
  joinTracker.set(guildId, joins);

  const triggered = joins.length >= threshold;
  return { triggered, count: joins.length, windowHours: config.windowHours ?? 1 };
}

// ============================================================
//  Get all recent joiners (used to punish contributors)
// ============================================================
function getRecentJoiners(guildId, windowMs) {
  const now   = Date.now();
  const joins = joinTracker.get(guildId) ?? [];
  return joins.filter(j => now - j.timestamp < windowMs).map(j => j.userId);
}

// ============================================================
//  Clear join tracker for a guild (after raid ends)
// ============================================================
function clearJoinTracker(guildId) {
  joinTracker.delete(guildId);
}

// ============================================================
//  Send raid alert to warn roles
// ============================================================
async function sendRaidAlert(guild, config, count, logChannel) {
  if (!logChannel) return;

  const mentions = (config.warnRoles ?? []).map(id => `<@&${id}>`).join(" ");

  await logChannel.send({
    content: mentions || undefined,
    embeds: [new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${e.raidOn} JOIN RAID DETECTED — ${guild.name}`)
      .setDescription(
        `**${count}** accounts joined in the last **${config.windowHours ?? 1}h**!\n\n` +
        `${e.shield} Raid mode is now **active**.\n` +
        `New joins matching raid criteria will be punished automatically.\n\n` +
        `Use \`!joinraid off\` to deactivate raid mode manually.`
      )
      .setTimestamp()],
  }).catch(() => {});
}

module.exports = { trackJoin, getRecentJoiners, clearJoinTracker, sendRaidAlert };
