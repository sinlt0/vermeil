// ============================================================
//  utils/levelUtils.js
//  Core leveling system logic
//  - XP formula (Amari-style)
//  - Level up detection
//  - Multiplier calculation
//  - Level up message sender
//  - Rank card generator
//  - Variable replacer
//  - Weekly reset checker
// ============================================================
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage }         = require("@napi-rs/canvas");
const { fromConnection: UserLevel }       = require("../models/UserLevel");
const { fromConnection: LevelSettings }   = require("../models/LevelSettings");

// ============================================================
//  XP Formula (Amari-style)
//  XP needed to reach level N = 100 * N * (N + 1) / 2
//  So level 1 = 100, level 2 = 300, level 3 = 600 etc.
// ============================================================
function xpForLevel(level) {
  return 100 * level * (level + 1) / 2;
}

function totalXPForLevel(level) {
  let total = 0;
  for (let i = 1; i <= level; i++) total += xpForLevel(i);
  return total;
}

function getLevelFromXP(xp) {
  let level = 0;
  let total = 0;
  while (true) {
    const needed = xpForLevel(level + 1);
    if (total + needed > xp) break;
    total += needed;
    level++;
  }
  return { level, currentXP: xp - total, neededXP: xpForLevel(level + 1) };
}

// ============================================================
//  Get multiplier for a member
// ============================================================
function getMultiplier(member, settings) {
  if (!settings.multipliers || settings.multipliers.length === 0) return 1;

  const roleMultipliers = settings.multipliers
    .filter(m => m.type === "role" && member.roles.cache.has(m.targetId))
    .map(m => m.multiplier);

  const userMultiplier = settings.multipliers
    .find(m => m.type === "user" && m.targetId === member.id)
    ?.multiplier ?? null;

  if (settings.stackMultipliers) {
    // Stack all multipliers together
    let total = 1;
    for (const m of roleMultipliers) total *= m;
    if (userMultiplier) total *= userMultiplier;
    return total;
  } else {
    // Use highest multiplier only
    const all = [...roleMultipliers];
    if (userMultiplier) all.push(userMultiplier);
    return all.length > 0 ? Math.max(...all) : 1;
  }
}

// ============================================================
//  Add XP to a user
//  Returns { leveled, oldLevel, newLevel, xpAdded } 
// ============================================================
async function addXP(client, guildId, member, xpAmount, connection) {
  const UserLevelModel = UserLevel(connection);

  const data = await UserLevelModel.findOneAndUpdate(
    { guildId, userId: member.id },
    {
      $inc: { xp: xpAmount, totalXP: xpAmount, weeklyXP: xpAmount },
      $setOnInsert: { guildId, userId: member.id },
    },
    { upsert: true, new: true }
  );

  const oldLevel = data.level;
  const { level: newLevel } = getLevelFromXP(data.xp);

  let leveled = false;

  if (newLevel > oldLevel) {
    await UserLevelModel.findOneAndUpdate(
      { guildId, userId: member.id },
      { $set: { level: newLevel } }
    );
    leveled = true;
  }

  return { leveled, oldLevel, newLevel, xpAdded: xpAmount, data };
}

// ============================================================
//  Handle level up — send message + assign role rewards
// ============================================================
async function handleLevelUp(client, member, guild, oldLevel, newLevel, settings, connection) {
  // Assign role rewards
  const rewards = settings.roleRewards
    .filter(r => r.level <= newLevel && r.level > oldLevel);

  for (const reward of rewards) {
    const role = guild.roles.cache.get(reward.roleId);
    if (role) await member.roles.add(role).catch(() => {});
  }

  // Get the latest role reward for this level (for variable)
  const latestReward = settings.roleRewards
    .filter(r => r.level <= newLevel)
    .sort((a, b) => b.level - a.level)[0];

  const roleRewardName = latestReward
    ? guild.roles.cache.get(latestReward.roleId)?.name ?? "Unknown Role"
    : "None";

  // Find custom message for this level or use global
  const customMsg = settings.customMessages?.find(m => m.level === newLevel);
  const msgTemplate = customMsg?.message ?? settings.levelUpMessage;

  // Replace variables
  const message = await replaceLevelVariables(msgTemplate, member, newLevel, oldLevel, roleRewardName, connection, guild);

  // Send level up message
  if (settings.levelUpDM) {
    await member.user.send({ content: message }).catch(() => {});
  }

  if (settings.levelUpChannel) {
    const channel = guild.channels.cache.get(settings.levelUpChannel);
    if (channel) await channel.send({ content: message }).catch(() => {});
  }
}

// ============================================================
//  Variable replacer for level up messages
// ============================================================
async function replaceLevelVariables(str, member, newLevel, oldLevel, roleReward, connection, guild) {
  if (!str) return str;

  const UserLevelModel = UserLevel(connection);
  const data = await UserLevelModel.findOne({ guildId: guild.id, userId: member.id });
  const { currentXP, neededXP } = getLevelFromXP(data?.xp ?? 0);

  // Get rank
  const rank = await UserLevelModel.countDocuments({
    guildId: guild.id,
    xp: { $gt: data?.xp ?? 0 },
  }) + 1;

  const variables = {
    "{user}":          `<@${member.id}>`,
    "{username}":      member.user.username,
    "{userdisplayname}": member.user.displayName,
    "{usernick}":      member.nickname ?? member.user.displayName,
    "{usertag}":       member.user.tag,
    "{useravatar}":    member.user.displayAvatarURL({ dynamic: true }),
    "{userid}":        member.id,
    "{server}":        guild.name,
    "{membercount}":   guild.memberCount.toLocaleString(),
    "{level}":         newLevel.toString(),
    "{currentlv}":     newLevel.toString(),
    "{previouslv}":    oldLevel.toString(),
    "{xp}":            currentXP.toString(),
    "{nextlevelxp}":   neededXP.toString(),
    "{rolereward}":    roleReward,
    "{rank}":          rank.toString(),
  };

  let result = str;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

// ============================================================
//  Rank Card Generator
// ============================================================
async function generateRankCard(member, data, rank, settings) {
  const WIDTH  = 800;
  const HEIGHT = 200;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx    = canvas.getContext("2d");

  // ── Background gradient ──────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#1a1a2e");
  bg.addColorStop(0.5, "#16213e");
  bg.addColorStop(1, "#0f3460");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Subtle pattern overlay ───────────────────────────
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let i = 0; i < WIDTH; i += 20) {
    ctx.fillRect(i, 0, 1, HEIGHT);
  }

  // ── Avatar ───────────────────────────────────────────
  const AVATAR_SIZE = 120;
  const AVATAR_X    = 40;
  const AVATAR_Y    = (HEIGHT - AVATAR_SIZE) / 2;

  try {
    const avatarURL = member.user.displayAvatarURL({ extension: "png", size: 256 });
    const avatar    = await loadImage(avatarURL);

    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();

    // Avatar ring
    ctx.beginPath();
    ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = data.xpBarColor ?? "#5865F2";
    ctx.lineWidth   = 4;
    ctx.stroke();
  } catch {}

  // ── Text area ────────────────────────────────────────
  const TEXT_X = AVATAR_X + AVATAR_SIZE + 30;
  const TEXT_W = WIDTH - TEXT_X - 30;

  // Username
  ctx.font      = "bold 28px Sans";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(truncate(ctx, member.user.displayName, TEXT_W, "bold 28px Sans"), TEXT_X, AVATAR_Y + 35);

  // Tag
  ctx.font      = "16px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`@${member.user.username}`, TEXT_X, AVATAR_Y + 58);

  // Rank + Level (right aligned)
  const rankText  = `RANK #${rank}`;
  const levelText = `LEVEL ${data.level}`;

  ctx.font      = "bold 20px Sans";
  ctx.fillStyle = data.xpBarColor ?? "#5865F2";
  const rankW   = ctx.measureText(rankText).width;
  ctx.fillText(rankText, WIDTH - rankW - 30, AVATAR_Y + 35);

  ctx.font      = "16px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const lvlW    = ctx.measureText(levelText).width;
  ctx.fillText(levelText, WIDTH - lvlW - 30, AVATAR_Y + 58);

  // ── XP Bar ───────────────────────────────────────────
  const BAR_X  = TEXT_X;
  const BAR_Y  = AVATAR_Y + 75;
  const BAR_W  = TEXT_W;
  const BAR_H  = 20;
  const RADIUS = 10;

  const { currentXP, neededXP } = getLevelFromXP(data.xp);
  const progress = Math.min(currentXP / neededXP, 1);

  // Bar background
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(ctx, BAR_X, BAR_Y, BAR_W, BAR_H, RADIUS);
  ctx.fill();

  // Bar fill
  if (progress > 0) {
    const fillW = Math.max(BAR_W * progress, RADIUS * 2);
    const barGrad = ctx.createLinearGradient(BAR_X, 0, BAR_X + fillW, 0);
    const color   = data.xpBarColor ?? "#5865F2";
    barGrad.addColorStop(0, color);
    barGrad.addColorStop(1, lightenColor(color, 40));
    ctx.fillStyle = barGrad;
    roundRect(ctx, BAR_X, BAR_Y, fillW, BAR_H, RADIUS);
    ctx.fill();
  }

  // XP text below bar
  ctx.font      = "14px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`${currentXP.toLocaleString()} / ${neededXP.toLocaleString()} XP`, BAR_X, BAR_Y + BAR_H + 20);

  // Total XP right aligned
  const totalText = `Total XP: ${data.totalXP.toLocaleString()}`;
  ctx.font        = "14px Sans";
  const totalW    = ctx.measureText(totalText).width;
  ctx.fillText(totalText, WIDTH - totalW - 30, BAR_Y + BAR_H + 20);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "rank.png" });
}

// ── Helpers ───────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r   = Math.min(255, (num >> 16) + amount);
  const g   = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b   = Math.min(255, (num & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function truncate(ctx, text, maxWidth, font) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return text;
  while (ctx.measureText(text + "...").width > maxWidth && text.length > 0) {
    text = text.slice(0, -1);
  }
  return text + "...";
}

// ============================================================
//  Weekly Reset Checker
//  Called on bot ready — checks if weekly XP needs resetting
// ============================================================
async function checkWeeklyResets(client) {
  for (const [guildId] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;

      const LevelSettingsModel = LevelSettings(guildDb.connection);
      const settings = await LevelSettingsModel.findOne({ guildId });
      if (!settings || !settings.enabled) continue;

      const now  = new Date();
      const last = settings.lastWeeklyReset;

      // Get last Monday midnight in server timezone
      const lastMonday = getLastMonday(now, settings.timezone ?? "UTC");

      if (!last || last < lastMonday) {
        // Reset weekly XP
        const UserLevelModel = UserLevel(guildDb.connection);
        await UserLevelModel.updateMany({ guildId }, { $set: { weeklyXP: 0 } });
        await LevelSettingsModel.findOneAndUpdate(
          { guildId },
          { $set: { lastWeeklyReset: now } }
        );
      }
    } catch {}
  }

  // Schedule next check in 1 hour
  setTimeout(() => checkWeeklyResets(client), 60 * 60 * 1000);
}

function getLastMonday(date, timezone) {
  try {
    const now  = new Date(date.toLocaleString("en-US", { timeZone: timezone }));
    const day  = now.getDay(); // 0 = Sunday, 1 = Monday
    const diff = (day === 0 ? 6 : day - 1); // days since Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  } catch {
    // Invalid timezone — fall back to UTC
    const now    = new Date(date);
    const day    = now.getUTCDay();
    const diff   = (day === 0 ? 6 : day - 1);
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    return monday;
  }
}

module.exports = {
  xpForLevel,
  totalXPForLevel,
  getLevelFromXP,
  getMultiplier,
  addXP,
  handleLevelUp,
  replaceLevelVariables,
  generateRankCard,
  checkWeeklyResets,
};
