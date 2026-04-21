const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { AttachmentBuilder, WebhookClient } = require("discord.js");
require("dotenv").config();

/**
 * Fetch storage stats for a specific MongoDB connection
 */
async function getStorageStats(connection) {
  try {
    // 1. Get stats for the specific database the bot is using
    const stats = await connection.db.command({ dbStats: 1 });
    
    // 2. Get cluster-wide storage info (requires admin privileges)
    // Note: On many Atlas shared clusters, this might be limited.
    // We'll fallback to db-level stats if needed.
    const storageUsed = (stats.dataSize + stats.indexSize) / 1024 / 1024; // MB
    const storageAllocated = stats.storageSize / 1024 / 1024; // MB (Bot's reserved space)
    
    return {
      used: storageUsed.toFixed(2),
      allocated: storageAllocated.toFixed(2),
      collections: stats.collections,
      objects: stats.objects,
      avgObjSize: (stats.avgObjSize / 1024).toFixed(2) // KB
    };
  } catch (err) {
    console.error("[DB Monitor] Error fetching stats:", err.message);
    return null;
  }
}

/**
 * Generate a premium DB status image
 */
async function generateDbImage(clusterName, stats) {
  const WIDTH = 600;
  const HEIGHT = 350;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // ── Background ──
  const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  grad.addColorStop(0, "#1a0b2e");
  grad.addColorStop(1, "#0d051a");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Decorative Circle
  ctx.beginPath();
  ctx.arc(WIDTH, 0, 200, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(106, 13, 173, 0.1)";
  ctx.fill();

  // ── Header ──
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 28px Sans";
  ctx.fillText(`Vermeil / ${clusterName.toUpperCase()}`, 40, 60);

  ctx.fillStyle = "#a855f7";
  ctx.font = "16px Sans";
  ctx.fillText("DATABASE MONITORING SYSTEM", 40, 85);

  // ── Stats Grid ──
  const drawStat = (label, value, x, y) => {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "14px Sans";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 22px Sans";
    ctx.fillText(value, x, y + 30);
  };

  drawStat("STORAGE USED", `${stats.used} MB`, 40, 140);
  drawStat("RESERVED", `${stats.allocated} MB`, 220, 140);
  drawStat("COLLECTIONS", stats.collections, 400, 140);

  drawStat("TOTAL OBJECTS", stats.objects.toLocaleString(), 40, 230);
  drawStat("AVG OBJECT SIZE", `${stats.avgObjSize} KB`, 220, 230);
  drawStat("CLUSTER STATUS", "Healthy", 400, 230);

  // ── Footer ──
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(40, 280, WIDTH - 80, 1);
  
  ctx.font = "italic 12px Sans";
  ctx.fillText("Real-time telemetry provided by Vermeil multi-cluster manager", 40, 310);

  return new AttachmentBuilder(canvas.toBuffer("image/png"), { name: `db_${clusterName}.png` });
}

/**
 * Main function to run the monitor cycle
 */
async function runDbMonitor(client) {
  const webhookUrl = process.env.LOG_DATABASE_WEBHOOK;
  if (!webhookUrl || !client.db) return;

  const webhook = new WebhookClient({ url: webhookUrl });

  for (const [name, entry] of client.db.clusterMap) {
    if (entry.status !== "connected") continue;

    const stats = await getStorageStats(entry.connection);
    if (!stats) continue;

    const image = await generateDbImage(name, stats);
    
    const lastUpdate = new Date();
    const nextUpdate = new Date(lastUpdate.getTime() + 10 * 60000);

    const content = `**${name.toUpperCase()}** | Auto-refresh every 10 minutes | Last update: <t:${Math.floor(lastUpdate/1000)}:T> | Next update: <t:${Math.floor(nextUpdate/1000)}:T>`;

    await webhook.send({
      content,
      files: [image]
    }).catch(err => console.error(`[DB Monitor] Webhook failed for ${name}:`, err.message));
  }
}

module.exports = { runDbMonitor };
