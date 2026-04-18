// ============================================================
//  utils/modUtils.js
//  Shared helpers for moderation commands
//  - createCase      : creates a new mod case + increments counter
//  - sendModLog      : posts colour-coded embed to mod log channel
//  - parseDuration   : converts "1h30m" → ms
//  - formatDuration  : converts ms → "1h 30m"
//  - applyThreshold  : checks warn count and applies configured action
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: ModCase }      = require("../models/ModCase");
const { fromConnection: GuildSettings }= require("../models/GuildSettings");
const { fromConnection: WarnConfig }   = require("../models/WarnConfig");
const { fromConnection: TempBan }      = require("../models/TempBan");

// ── Action colours ────────────────────────────────────────
const ACTION_COLORS = {
  warn:       0xFEE75C, // yellow
  kick:       0xFF9800, // orange
  ban:        0xED4245, // red
  tempban:    0xE91E63, // pink-red
  unban:      0x57F287, // green
  timeout:    0x9C27B0, // purple
  untimeout:  0x5865F2, // blurple
};

const ACTION_EMOJIS = {
  warn:       "⚠️",
  kick:       "👢",
  ban:        "🔨",
  tempban:    "⏱️🔨",
  unban:      "✅",
  timeout:    "🔇",
  untimeout:  "🔊",
};

// ============================================================
//  createCase — saves a new mod case to the guild's cluster
// ============================================================
async function createCase(client, guildId, data) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;

  const ModCaseModel = ModCase(guildDb.connection);

  // Get next case number for this guild
  const last = await ModCaseModel
    .findOne({ guildId })
    .sort({ caseNumber: -1 })
    .select("caseNumber");

  const caseNumber = (last?.caseNumber ?? 0) + 1;

  const modCase = await ModCaseModel.create({
    guildId,
    caseNumber,
    ...data,
  });

  return modCase;
}

// ============================================================
//  sendModLog — posts a mod log embed to the guild's log channel
// ============================================================
async function sendModLog(client, guild, modCase) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const GuildSettingsModel = GuildSettings(guildDb.connection);
    const settings = await GuildSettingsModel.findOne({ guildId: guild.id });
    if (!settings?.modLogChannel) return;

    const channel = guild.channels.cache.get(settings.modLogChannel);
    if (!channel) return;

    const duration = modCase.duration ? ` (${formatDuration(modCase.duration)})` : "";

    const embed = new EmbedBuilder()
      .setColor(ACTION_COLORS[modCase.action] ?? 0x99AAB5)
      .setTitle(`${ACTION_EMOJIS[modCase.action]} ${capitalise(modCase.action)}  •  Case #${modCase.caseNumber}`)
      .addFields(
        { name: "👤 Target",    value: `${modCase.targetTag} (<@${modCase.targetId}>)`,         inline: true },
        { name: "🛡️ Moderator", value: `${modCase.moderatorTag} (<@${modCase.moderatorId}>)`,  inline: true },
        { name: "📋 Reason",    value: modCase.reason,                                          inline: false },
        ...(modCase.duration
          ? [{ name: "⏱️ Duration", value: formatDuration(modCase.duration) + duration, inline: true }]
          : []
        ),
      )
      .setTimestamp(modCase.createdAt)
      .setFooter({ text: `Case #${modCase.caseNumber} • ${guild.name}` });

    await channel.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  applyThreshold — check warn count, apply configured action
// ============================================================
async function applyThreshold(client, guild, member, warnCount) {
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return null;

  const WarnConfigModel = WarnConfig(guildDb.connection);
  const config = await WarnConfigModel.findOne({ guildId: guild.id });
  if (!config || !config.thresholds.length) return null;

  // Find exact match for this warn count
  const threshold = config.thresholds.find((t) => t.count === warnCount);
  if (!threshold) return null;

  return threshold; // { count, action, duration }
}

// ============================================================
//  scheduleTempBan — store + schedule auto-unban
// ============================================================
async function scheduleTempBan(client, guild, userId, userTag, expiresAt, caseNumber) {
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb) return;

  const TempBanModel = TempBan(guildDb.connection);
  await TempBanModel.findOneAndUpdate(
    { guildId: guild.id, userId },
    { guildId: guild.id, userId, userTag, expiresAt, caseNumber },
    { upsert: true, new: true }
  );

  // Schedule in-process timer (also handled by tempban checker on restart)
  const delay = expiresAt.getTime() - Date.now();
  if (delay > 0) {
    setTimeout(() => expireTempBan(client, guild.id, userId), delay);
  }
}

// ============================================================
//  expireTempBan — called when a tempban expires
// ============================================================
async function expireTempBan(client, guildId, userId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return;

    await guild.members.unban(userId, "Temporary ban expired.");

    // Clean up from DB
    const guildDb = await client.db.getGuildDb(guildId);
    if (!guildDb) return;

    const TempBanModel = TempBan(guildDb.connection);
    await TempBanModel.deleteOne({ guildId, userId });

    // Log the auto-unban
    const modCase = await createCase(client, guildId, {
      action:       "unban",
      targetId:     userId,
      targetTag:    "Unknown User",
      moderatorId:  client.user.id,
      moderatorTag: client.user.tag,
      reason:       "Temporary ban expired.",
    });

    if (modCase) await sendModLog(client, guild, modCase);
  } catch {}
}

// ============================================================
//  restoreTempBans — called on bot ready to reschedule active bans
// ============================================================
async function restoreTempBans(client) {
  for (const [guildId] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;

      const TempBanModel = TempBan(guildDb.connection);
      const activeBans   = await TempBanModel.find({ guildId });

      for (const ban of activeBans) {
        const delay = ban.expiresAt.getTime() - Date.now();
        if (delay <= 0) {
          // Already expired while bot was offline — unban immediately
          await expireTempBan(client, guildId, ban.userId);
        } else {
          setTimeout(() => expireTempBan(client, guildId, ban.userId), delay);
        }
      }
    } catch {}
  }
}

// ============================================================
//  parseDuration — "1d2h30m10s" → ms
// ============================================================
function parseDuration(str) {
  if (!str) return null;
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let ms = 0;
  let match;
  const units = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  while ((match = regex.exec(str)) !== null) {
    ms += parseInt(match[1]) * (units[match[2].toLowerCase()] ?? 0);
  }
  return ms || null;
}

// ============================================================
//  formatDuration — ms → "1d 2h 30m 10s"
// ============================================================
function formatDuration(ms) {
  if (!ms) return "N/A";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(" ") || "0s";
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  createCase,
  sendModLog,
  applyThreshold,
  scheduleTempBan,
  expireTempBan,
  restoreTempBans,
  parseDuration,
  formatDuration,
  ACTION_COLORS,
  ACTION_EMOJIS,
};
