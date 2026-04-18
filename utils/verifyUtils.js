// ============================================================
//  utils/verifyUtils.js
// ============================================================
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const svgCaptcha = require("svg-captcha");
const emoji      = require("../emojis/verifyemoji");

// ============================================================
//  In-memory captcha store
// ============================================================
const pendingCaptchas = new Map();

function getCaptchaKey(userId, guildId) { return `${userId}_${guildId}`; }

function storeCaptcha(userId, guildId, text, retryLimit) {
  pendingCaptchas.set(getCaptchaKey(userId, guildId), {
    text, attempts: 0, retryLimit,
    expires: Date.now() + 5 * 60 * 1000,
  });
}

function getCaptcha(userId, guildId) {
  const key  = getCaptchaKey(userId, guildId);
  const data = pendingCaptchas.get(key);
  if (!data) return null;
  if (Date.now() > data.expires) { pendingCaptchas.delete(key); return null; }
  return data;
}

function deleteCaptcha(userId, guildId) {
  pendingCaptchas.delete(getCaptchaKey(userId, guildId));
}

// ============================================================
//  Generate captcha and return BOTH text and PNG buffer
//  Uses @napi-rs/canvas to render the SVG → PNG
//  Discord only renders PNG/JPG in embeds, NOT SVG
// ============================================================
async function generateCaptcha() {
  const captcha = svgCaptcha.create({
    size:       6,
    noise:      3,
    color:      true,
    background: "#1e1e2e",
    width:      280,
    height:     100,
    fontSize:   58,
    charPreset: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
    ignoreChars: "0o1iIl",
  });

  // ── Convert SVG → PNG using canvas ───────────────
  const pngBuffer = await svgToPng(captcha.data, 280, 100);

  return {
    text:   captcha.text,
    buffer: pngBuffer,
  };
}

// ============================================================
//  SVG → PNG conversion using @napi-rs/canvas
//  Draws SVG as a data URL onto canvas then exports PNG
// ============================================================
async function svgToPng(svgString, width, height) {
  try {
    // Try @resvg/resvg-js first (fastest, best quality)
    const { Resvg } = require("@resvg/resvg-js");
    const resvg     = new Resvg(svgString, {
      fitTo:      { mode: "width", value: width },
      background: "#1e1e2e",
    });
    const rendered = resvg.render();
    return rendered.asPng();
  } catch {
    // Fallback: encode SVG as base64 data URL and draw on canvas
    try {
      const b64    = Buffer.from(svgString).toString("base64");
      const dataUrl = `data:image/svg+xml;base64,${b64}`;
      const canvas  = createCanvas(width, height);
      const ctx     = canvas.getContext("2d");

      // Fill background
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, width, height);

      const img = await loadImage(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      return canvas.toBuffer("image/png");
    } catch {
      // Last resort: draw text manually on canvas
      return drawCaptchaFallback(width, height);
    }
  }
}

// ============================================================
//  Last resort canvas fallback — draws simple styled text
// ============================================================
function drawCaptchaFallback(width, height) {
  const canvas = createCanvas(width, height);
  const ctx    = canvas.getContext("2d");

  ctx.fillStyle = "#1e1e2e";
  ctx.fillRect(0, 0, width, height);

  // Noise lines
  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = `hsl(${Math.random() * 360}, 70%, 60%)`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.lineTo(Math.random() * width, Math.random() * height);
    ctx.stroke();
  }

  // Noise dots
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = `hsl(${Math.random() * 360}, 70%, 70%)`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toBuffer("image/png");
}

// ============================================================
//  Build captcha AttachmentBuilder (PNG)
// ============================================================
function buildCaptchaAttachment(pngBuffer) {
  return new AttachmentBuilder(pngBuffer, { name: "captcha.png" });
}

// ============================================================
//  Generate default verification canvas card
//  Purple theme, bot logo center, "Verify Now" text
// ============================================================
async function generateVerifyCard(client) {
  const W = 600, H = 250;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // Purple gradient background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0,   "#1a0933");
  bg.addColorStop(0.5, "#2d1b69");
  bg.addColorStop(1,   "#1a0933");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid overlay
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth   = 1;
  for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Glow behind logo
  const grd = ctx.createRadialGradient(W/2, H/2 - 20, 10, W/2, H/2 - 20, 80);
  grd.addColorStop(0, "rgba(139,92,246,0.4)");
  grd.addColorStop(1, "rgba(139,92,246,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // Bot logo
  const LOGO_SIZE = 90;
  const LOGO_X    = W/2 - LOGO_SIZE/2;
  const LOGO_Y    = H/2 - LOGO_SIZE/2 - 20;

  try {
    const avatarURL = client.user.displayAvatarURL({ extension: "png", size: 256 });
    const img       = await loadImage(avatarURL);
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, LOGO_Y + LOGO_SIZE/2, LOGO_SIZE/2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
    ctx.restore();
    // Glow border
    ctx.save();
    ctx.beginPath();
    ctx.arc(W/2, LOGO_Y + LOGO_SIZE/2, LOGO_SIZE/2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth   = 3;
    ctx.shadowColor = "#8b5cf6";
    ctx.shadowBlur  = 15;
    ctx.stroke();
    ctx.restore();
  } catch {}

  // "Verify Now" text
  ctx.font         = "bold 32px Sans";
  ctx.textAlign    = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.shadowColor = "#8b5cf6";
  ctx.shadowBlur  = 12;
  ctx.fillStyle   = "#ffffff";
  ctx.fillText("Verify Now", W/2, LOGO_Y + LOGO_SIZE + 30);
  ctx.restore();

  // Bottom accent line
  const line = ctx.createLinearGradient(0, 0, W, 0);
  line.addColorStop(0,   "transparent");
  line.addColorStop(0.5, "#8b5cf6");
  line.addColorStop(1,   "transparent");
  ctx.fillStyle = line;
  ctx.fillRect(0, H - 3, W, 3);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "verify-card.png" });
}

// ============================================================
//  Build verification embed
// ============================================================
async function buildVerifyEmbed(guild, config, client) {
  const type = config.type === "captcha" ? "Captcha" : "One-Click";

  const embed = new EmbedBuilder()
    .setColor(0x8b5cf6)
    .setTitle(`${emoji.shield} Verification Required`)
    .setDescription(
      `**${guild.name}** requires you to verify yourself to get access to other channels.\n\n` +
      `You can simply verify by clicking the **Verify** button below.\n\u200b`
    )
    .addFields(
      { name: `${emoji.lock} Type`,    value: type,                   inline: true },
      { name: `${emoji.user} Members`, value: `${guild.memberCount}`, inline: true },
    )
    .setFooter({ text: `${guild.name} • Verification System`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
    .setTimestamp();

  if (config.imageUrl) embed.setImage(config.imageUrl);
  else                  embed.setImage("attachment://verify-card.png");

  return embed;
}

// ============================================================
//  Build verify button row
// ============================================================
function buildVerifyRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify_start")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
      .setEmoji(emoji.shield),
  );
}

module.exports = {
  generateCaptcha,
  buildCaptchaAttachment,
  generateVerifyCard,
  buildVerifyEmbed,
  buildVerifyRow,
  storeCaptcha,
  getCaptcha,
  deleteCaptcha,
};
