const { createCanvas, loadImage: canvasLoadImage } = require("@napi-rs/canvas");
const { AttachmentBuilder } = require("discord.js");
const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * Custom loader to bypass SSL issues
 */
async function loadImage(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', httpsAgent });
    return await canvasLoadImage(res.data);
  } catch (err) {
    console.error(`[Ship Utils] Failed to load image: ${url}`, err.message);
    throw err;
  }
}

/**
 * Generate a modern Ship Card using Canvas
 */
async function generateShipCard(user1, user2, lovePercentage) {
  const WIDTH = 700;
  const HEIGHT = 250;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // ── 1. Background ──
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#1a1a2e");
  bg.addColorStop(1, "#16213e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── 2. Load Avatars ──
  try {
    const avatar1 = await loadImage(user1.displayAvatarURL({ extension: "png", size: 256 }));
    const avatar2 = await loadImage(user2.displayAvatarURL({ extension: "png", size: 256 }));

    // Avatar 1
    drawCircularAvatar(ctx, avatar1, 100, 125, 80);
    // Avatar 2
    drawCircularAvatar(ctx, avatar2, 600, 125, 80);
  } catch (err) {
    console.error("[Ship Utils] Avatar Load Error:", err.message);
  }

  // ── 3. Meter (Middle) ──
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;

  // Track
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  roundRect(ctx, centerX - 100, centerY + 40, 200, 15, 10);
  ctx.fill();

  // Fill
  const fillWidth = (lovePercentage / 100) * 200;
  const grad = ctx.createLinearGradient(centerX - 100, 0, centerX + 100, 0);
  grad.addColorStop(0, "#ff4b2b");
  grad.addColorStop(1, "#ff416c");
  ctx.fillStyle = grad;
  roundRect(ctx, centerX - 100, centerY + 40, fillWidth, 15, 10);
  ctx.fill();

  // Heart Icon (Center)
  ctx.font = "bold 50px Sans";
  ctx.textAlign = "center";
  ctx.shadowColor = "#ff4b2b";
  ctx.shadowBlur = 20;
  ctx.fillText("❤️", centerX, centerY + 20);
  ctx.shadowBlur = 0;

  // Percentage Text
  ctx.font = "bold 24px Sans";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(`${lovePercentage}%`, centerX, centerY + 85);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: "ship.png" });
}

function drawCircularAvatar(ctx, img, x, y, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
  ctx.restore();

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 5;
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

module.exports = { generateShipCard };
