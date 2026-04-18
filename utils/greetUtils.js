// ============================================================
//  utils/greetUtils.js
//  Modernized Welcome/Leave System
// ============================================================
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const path = require("path");

// ============================================================
//  Variable Replacer
// ============================================================
async function replaceVariables(str, member, type = "welcome") {
  if (!str) return str;

  const guild = member.guild;
  const user  = member.user;

  // ── Fetch Level Data ──
  let level = 0, xp = 0, rank = "N/A";
  try {
    const { fromConnection: UserLevel } = require("../models/UserLevel");
    const { getLevelFromXP } = require("./levelUtils");
    const client = member.client;
    const guildDb = await client.db?.getGuildDb(guild.id);
    
    if (guildDb && !guildDb.isDown) {
      const data = await UserLevel(guildDb.connection).findOne({ guildId: guild.id, userId: user.id });
      if (data) {
        const lvInfo = getLevelFromXP(data.xp);
        level = data.level;
        xp = lvInfo.currentXP;
        rank = await UserLevel(guildDb.connection).countDocuments({ guildId: guild.id, xp: { $gt: data.xp } }) + 1;
      }
    }
  } catch {}

  const variables = {
    "{user}":            `<@${user.id}>`,
    "{username}":        user.username,
    "{usertag}":         user.tag,
    "{userid}":          user.id,
    "{server}":          guild.name,
    "{servername}":      guild.name,
    "{guildname}":       guild.name,
    "{membercount}":     guild.memberCount.toLocaleString(),
    "{useravatar}":      user.displayAvatarURL({ extension: "png", size: 512 }),
    "{guildicon}":       guild.iconURL({ extension: "png", size: 512 }) || "",
    "{guildbanner}":     guild.bannerURL({ extension: "png", size: 1024 }) || "",
    "{joindate}":        member.joinedAt?.toLocaleDateString() || "Unknown",
    "{currentdate}":     new Date().toLocaleDateString(),
    // Level Variables
    "{level}":           level.toString(),
    "{xp}":              xp.toString(),
    "{rank}":            rank.toString(),
  };

  let result = str;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

// ============================================================
//  Premium Card Generator
// ============================================================
async function generateCard(member, type = "welcome", backgroundUrl = null) {
  const WIDTH  = 1024;
  const HEIGHT = 450;

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx    = canvas.getContext("2d");

  // ── 1. Background ──
  if (backgroundUrl) {
    try {
      const bg = await loadImage(backgroundUrl);
      ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
    } catch {
      drawDefaultBg(ctx, WIDTH, HEIGHT, type);
    }
  } else {
    drawDefaultBg(ctx, WIDTH, HEIGHT, type);
  }

  // ── 2. Glassmorphism Overlay ──
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  // Center Card
  const CX = 50, CY = 50, CW = WIDTH - 100, CH = HEIGHT - 100;
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  roundRect(ctx, CX, CY, CW, CH, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── 3. Avatar ──
  const avatarSize = 180;
  const avatarX = WIDTH / 2 - avatarSize / 2;
  const avatarY = 80;

  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: "png", size: 256 }));
    
    // Avatar Glow
    ctx.save();
    ctx.shadowColor = type === "welcome" ? "#5865F2" : "#ED4245";
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = type === "welcome" ? "rgba(88, 101, 242, 0.3)" : "rgba(237, 66, 69, 0.3)";
    ctx.fill();
    ctx.restore();

    // Clip Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(WIDTH / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Border
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch {}

  // ── 4. Text ──
  ctx.textAlign = "center";
  
  // Title (WELCOME / GOODBYE)
  ctx.font = "bold 32px Sans";
  ctx.fillStyle = type === "welcome" ? "#5865F2" : "#ED4245";
  ctx.fillText(type === "welcome" ? "WELCOME" : "GOODBYE", WIDTH / 2, avatarY + avatarSize + 50);

  // Username
  ctx.font = "bold 48px Sans";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(member.user.username, WIDTH / 2, avatarY + avatarSize + 105);

  // Subtitle
  ctx.font = "24px Sans";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  const sub = type === "welcome" 
    ? `You are our #${member.guild.memberCount.toLocaleString()} member!`
    : `We are now ${member.guild.memberCount.toLocaleString()} members.`;
  ctx.fillText(sub, WIDTH / 2, avatarY + avatarSize + 145);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: `${type}-card.png` });
}

function drawDefaultBg(ctx, w, h, type) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  if (type === "welcome") {
    g.addColorStop(0, "#0f0c29"); g.addColorStop(0.5, "#302b63"); g.addColorStop(1, "#24243e");
  } else {
    g.addColorStop(0, "#23074d"); g.addColorStop(1, "#cc5333");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ============================================================
//  Build Greet Embed
// ============================================================
async function buildGreetEmbed(config, member, type, card) {
  const e = config.embed || {};
  
  // Check if embed has any content at all
  const hasContent = e.title || e.description || e.footer || e.author || e.thumbnail || e.image || card;
  if (!hasContent) return null;

  const embed = new EmbedBuilder()
    .setColor(e.color ? parseInt(e.color.replace("#", ""), 16) : (type === "welcome" ? 0x5865F2 : 0xED4245));

  if (e.title)       embed.setTitle(await replaceVariables(e.title, member, type));
  if (e.description) embed.setDescription(await replaceVariables(e.description, member, type));
  if (e.footer)      embed.setFooter({ text: await replaceVariables(e.footer, member, type) });
  if (e.thumbnail)   embed.setThumbnail(await replaceVariables(e.thumbnail, member, type));
  
  if (card) {
    embed.setImage(`attachment://${type}-card.png`);
  } else if (e.image) {
    const imgUrl = await replaceVariables(e.image, member, type);
    if (imgUrl.startsWith("http")) embed.setImage(imgUrl);
  }

  return embed;
}

// ============================================================
//  Send Greet Message
// ============================================================
async function sendGreetMessage(client, member, type, settings) {
  const config = settings[type];
  if (!config?.enabled || !config.channelId) return;

  const channel = member.guild.channels.cache.get(config.channelId);
  // Check if channel exists and bot has permissions
  if (!channel || !channel.permissionsFor(member.guild.members.me).has(["SendMessages", "EmbedLinks"])) {
    console.warn(`[Greet] Missing permissions or channel not found in ${member.guild.id}`);
    return;
  }

  try {
    let card = null;
    if (config.cardEnabled) {
      card = await generateCard(member, type, config.cardBackground).catch(err => {
        console.error("[Greet] Card Generation Failed:", err.message);
        return null;
      });
    }

    const content = config.message ? await replaceVariables(config.message, member, type) : null;
    const embed   = config.useEmbed ? await buildGreetEmbed(config, member, type, card) : null;

    const payload = {};
    if (content) payload.content = content;
    if (embed)   payload.embeds  = [embed];
    if (card)    payload.files   = [card];

    // Final sanity check: don't send if payload is totally empty
    if (!payload.content && !payload.embeds && !payload.files) return;

    await channel.send(payload);
  } catch (err) {
    console.error(`[Greet] Send Error:`, err.message);
  }
}

module.exports = { replaceVariables, generateCard, buildGreetEmbed, sendGreetMessage };
