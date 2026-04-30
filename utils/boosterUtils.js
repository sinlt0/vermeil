// ============================================================
//  utils/boosterUtils.js
//  Booster System Utilities
// ============================================================
const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { replaceVariables: baseReplaceVariables } = require("./greetUtils");

/**
 * Enhanced Variable Replacer for Boosters
 */
async function replaceBoosterVariables(str, member, boostCount = 0) {
  if (!str) return str;

  // Start with base variables from greetUtils
  let result = await baseReplaceVariables(str, member);

  const variables = {
    "{boostcount}":  boostCount.toString(),
    "{totalboosts}": member.guild.premiumSubscriptionCount.toString(),
    "{boostlevel}":  member.guild.premiumTier.toString(),
  };

  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

/**
 * Generate a Booster Card (Similar to Welcome Card but Pink/Diamond themed)
 */
async function generateBoosterCard(member, boostCount = 1, backgroundUrl = null) {
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
      drawBoostBg(ctx, WIDTH, HEIGHT);
    }
  } else {
    drawBoostBg(ctx, WIDTH, HEIGHT);
  }

  // ── 2. Glassmorphism Overlay ──
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  
  const CX = 50, CY = 50, CW = WIDTH - 100, CH = HEIGHT - 100;
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  roundRect(ctx, CX, CY, CW, CH, 30);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // ── 3. Avatar ──
  const avatarSize = 180;
  const avatarX = WIDTH / 2 - avatarSize / 2;
  const avatarY = 80;

  try {
    const avatar = await loadImage(member.user.displayAvatarURL({ extension: "png", size: 256 }));
    
    // Avatar Glow (Pink)
    ctx.save();
    ctx.shadowColor = "#F47FFF";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(WIDTH / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(244, 127, 255, 0.4)";
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
  
  // Title
  ctx.font = "bold 36px Sans";
  ctx.fillStyle = "#F47FFF";
  ctx.fillText("SERVER BOOSTED!", WIDTH / 2, avatarY + avatarSize + 55);

  // Username
  ctx.font = "bold 48px Sans";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(member.user.username, WIDTH / 2, avatarY + avatarSize + 110);

  // Subtitle
  ctx.font = "26px Sans";
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.fillText(`Thank you for your ${boostCount}${getOrdinal(boostCount)} boost!`, WIDTH / 2, avatarY + avatarSize + 155);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "boost-card.png" });
}

function drawBoostBg(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#F47FFF");
  g.addColorStop(1, "#FFC0CB");
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

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

/**
 * Build Booster Embed
 */
async function buildBoosterEmbed(config, member, boostCount = 1, card = null) {
  const e = config.embed || {};
  const hasContent = e.title || e.description || e.footer || e.author || e.thumbnail || e.image || card;
  if (!hasContent) return null;

  const embed = new EmbedBuilder()
    .setColor(e.color ? parseInt(e.color.replace("#", ""), 16) : 0xF47FFF);

  if (e.title)       embed.setTitle(await replaceBoosterVariables(e.title, member, boostCount));
  if (e.description) embed.setDescription(await replaceBoosterVariables(e.description, member, boostCount));
  if (e.footer)      embed.setFooter({ text: await replaceBoosterVariables(e.footer, member, boostCount) });
  if (e.thumbnail)   embed.setThumbnail(await replaceBoosterVariables(e.thumbnail, member, boostCount));
  
  if (card) {
    embed.setImage("attachment://boost-card.png");
  } else if (e.image) {
    const imgUrl = await replaceBoosterVariables(e.image, member, boostCount);
    if (imgUrl.startsWith("http")) embed.setImage(imgUrl);
  }

  return embed;
}

/**
 * Handle Role Rewards
 */
async function handleRoleRewards(member, boostCount, config) {
  if (!config.roleRewards || config.roleRewards.size === 0) return;

  const roleId = config.roleRewards.get(boostCount.toString());
  if (!roleId) return;

  const role = member.guild.roles.cache.get(roleId);
  if (!role) return;

  try {
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(role, `Booster reward for ${boostCount} boosts.`);
    }
  } catch (err) {
    console.error(`[Booster] Role Reward Error in ${member.guild.id}:`, err.message);
  }
}

module.exports = {
  replaceBoosterVariables,
  generateBoosterCard,
  buildBoosterEmbed,
  handleRoleRewards,
};
