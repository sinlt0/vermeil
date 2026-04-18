// ============================================================
//  utils/ecoLeaderboardUtils.js
//  Leaderboard helpers — fetch, format, paginate
// ============================================================
const { EmbedBuilder } = require("discord.js");
const eco              = require("../emojis/ecoemoji");
const { formatNum }    = require("./ecoUtils");

// ============================================================
//  Get weekly leaderboard for a category
// ============================================================
async function getWeeklyLeaderboard(client, field, limit = 10) {
  const WeeklyStats = client.ecoDb.getModel("Weeklystats");
  if (!WeeklyStats) return [];

  const weekStart = getWeekStart();
  return WeeklyStats.find({ weekStart })
    .sort({ [field]: -1 })
    .limit(limit)
    .lean();
}

// ============================================================
//  Get lifetime leaderboard for a field
// ============================================================
async function getLifetimeLeaderboard(client, field, limit = 10) {
  const UserProfile = client.ecoDb.getModel("Userprofile");
  if (!UserProfile) return [];

  return UserProfile.find({ agreedToTos: true })
    .sort({ [field]: -1 })
    .limit(limit)
    .select(`userId username ${field}`)
    .lean();
}

// ============================================================
//  Build leaderboard embed
// ============================================================
function buildLbEmbed(title, entries, valueField, valueLabel, client) {
  const rankEmojis = [eco.gold, eco.silver, eco.bronze];
  const lines      = entries.map((e, i) => {
    const rank  = rankEmojis[i] ?? `\`#${i+1}\``;
    const name  = e.username ?? `<@${e.userId}>`;
    const value = formatNum(e[valueField] ?? 0);
    return `${rank} **${name}** — ${value} ${valueLabel}`;
  });

  return new EmbedBuilder()
    .setColor(0xFEE75C)
    .setTitle(`${eco.lb} ${title}`)
    .setDescription(lines.join("\n") || "*No data yet.*")
    .setTimestamp();
}

// ============================================================
//  Get week start (Monday 00:00 UTC)
// ============================================================
function getWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const d   = new Date(now);
  d.setUTCDate(now.getUTCDate() - ((day + 6) % 7));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ============================================================
//  Track a weekly stat increment
// ============================================================
async function trackWeeklyStat(client, userId, field, amount = 1) {
  try {
    const WeeklyStats = client.ecoDb?.getModel("Weeklystats");
    if (!WeeklyStats) return;
    const weekStart = getWeekStart();
    await WeeklyStats.findOneAndUpdate(
      { userId, weekStart },
      { $inc: { [field]: amount }, $setOnInsert: { userId, weekStart } },
      { upsert: true }
    );
  } catch {}
}

module.exports = {
  getWeeklyLeaderboard,
  getLifetimeLeaderboard,
  buildLbEmbed,
  trackWeeklyStat,
  getWeekStart,
};
