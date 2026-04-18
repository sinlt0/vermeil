// ============================================================
//  utils/premiumUtils.js
//  Premium check helpers used across commands
//
//  Usage in commands:
//    import:  const { isPremium, getPremiumLimit, premiumEmbed } = require("../../utils/premiumUtils");
//
//  1. Hard gate (premium: true on command):
//     Handled automatically by commandRunner.js
//
//  2. Soft limit per command:
//     const limit = await getPremiumLimit(client, guildId, { free: 3, premium: 10 });
//     if (count >= limit.value) return reply(ctx, { embeds: [limit.embed] });
//
//  3. Manual check:
//     if (!(await isPremium(client, guildId))) return reply(ctx, { embeds: [premiumEmbed()] });
// ============================================================
const { EmbedBuilder } = require("discord.js");

// ── Duration string → ms ──────────────────────────────────
const DURATIONS = {
  "1 month":   30  * 24 * 60 * 60 * 1000,
  "3 months":  90  * 24 * 60 * 60 * 1000,
  "6 months":  180 * 24 * 60 * 60 * 1000,
  "1 year":    365 * 24 * 60 * 60 * 1000,
  "lifetime":  null,
};

function getDurationMs(label) {
  return DURATIONS[label.toLowerCase()] ?? (30 * 24 * 60 * 60 * 1000);
}

function getDurationChoices() {
  return Object.keys(DURATIONS);
}

// ============================================================
//  Check if a guild has active premium
// ============================================================
async function isPremium(client, guildId) {
  try {
    const guildDb = await client.db.getGuildDb(guildId);
    if (!guildDb || guildDb.isDown) return false;

    const { fromConnection } = require("../models/Premium");
    const PremiumModel       = fromConnection(guildDb.connection);
    const record             = await PremiumModel.findOne({ guildId }).lean();

    if (!record)        return false;
    if (!record.active) return false;
    if (record.lifetime) return true;
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}

// ============================================================
//  Get premium record for a guild
// ============================================================
async function getPremiumRecord(client, guildId) {
  try {
    const guildDb = await client.db.getGuildDb(guildId);
    if (!guildDb || guildDb.isDown) return null;

    const { fromConnection } = require("../models/Premium");
    const PremiumModel       = fromConnection(guildDb.connection);
    return PremiumModel.findOne({ guildId });
  } catch {
    return null;
  }
}

// ============================================================
//  Soft limit helper
//  Returns { value, isPremium } so command knows which limit
//  and can show appropriate upsell if user hits free limit
//
//  Example:
//    const limit = await getPremiumLimit(client, guildId, { free: 3, premium: 10 });
//    if (currentCount >= limit.value) {
//      return reply(ctx, { embeds: [limit.embed("You've hit the limit!")] });
//    }
// ============================================================
async function getPremiumLimit(client, guildId, { free, premium }) {
  const hasPremium = await isPremium(client, guildId);
  const value      = hasPremium ? premium : free;

  const embed = (msg) => new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle("✨ Premium Required")
    .setDescription(
      `${msg ? msg + "\n\n" : ""}` +
      `**Free limit:** \`${free}\`\n` +
      `**Premium limit:** \`${premium}\`\n\n` +
      `Upgrade to **Premium** to unlock higher limits!\n` +
      `Contact the bot owner to get Premium for your server.`
    );

  return { value, isPremium: hasPremium, embed };
}

// ============================================================
//  Standard "premium required" embed
//  Used when a command has premium: true and server isn't premium
// ============================================================
function premiumEmbed() {
  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle("✨ Premium Required")
    .setDescription(
      `This feature is exclusive to **Premium** servers.\n\n` +
      `Contact the bot owner to get Premium for your server.\n` +
      `Validity options: 1 month, 3 months, 6 months, 1 year, lifetime.`
    )
    .setFooter({ text: "Premium • Unlock the full experience" });
}

// ============================================================
//  Format time remaining
// ============================================================
function formatExpiry(expiresAt, lifetime = false) {
  if (lifetime) return "♾️ Lifetime";
  if (!expiresAt) return "Unknown";

  const now  = Date.now();
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "❌ Expired";

  const days    = Math.floor(diff / 86400000);
  const hours   = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0)   return `${days}d ${hours}h remaining`;
  if (hours > 0)  return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

// ============================================================
//  Check and expire premium records
//  Called by scheduler every hour
// ============================================================
async function checkPremiumExpiry(client) {
  try {
    const allGuilds = client.guilds.cache;

    for (const [guildId] of allGuilds) {
      try {
        const guildDb = await client.db.getGuildDb(guildId);
        if (!guildDb || guildDb.isDown) continue;

        const { fromConnection } = require("../models/Premium");
        const PremiumModel       = fromConnection(guildDb.connection);
        const record             = await PremiumModel.findOne({ guildId, active: true, lifetime: false });
        if (!record || !record.expiresAt) continue;

        const now        = new Date();
        const expiresAt  = new Date(record.expiresAt);
        const daysLeft   = (expiresAt.getTime() - now.getTime()) / 86400000;

        // ── 3-day warning ────────────────────────────
        if (daysLeft <= 3 && daysLeft > 0 && !record.warnedAt) {
          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) {
              await owner.user.send({
                embeds: [new EmbedBuilder()
                  .setColor(0xFEE75C)
                  .setTitle("⚠️ Premium Expiring Soon")
                  .setDescription(
                    `Your Premium for **${guild.name}** expires in **${Math.ceil(daysLeft)} day${Math.ceil(daysLeft) !== 1 ? "s" : ""}**!\n\n` +
                    `Contact the bot owner to renew before it expires.`
                  )
                  .setTimestamp()],
              }).catch(() => {});
            }
          }
          await PremiumModel.findOneAndUpdate({ guildId }, { $set: { warnedAt: now } });
        }

        // ── Mark expired ─────────────────────────────
        if (expiresAt < now) {
          await PremiumModel.findOneAndUpdate({ guildId }, { $set: { active: false } });

          const guild = client.guilds.cache.get(guildId);
          if (guild) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner) {
              await owner.user.send({
                embeds: [new EmbedBuilder()
                  .setColor(0xED4245)
                  .setTitle("❌ Premium Expired")
                  .setDescription(
                    `Your Premium for **${guild.name}** has **expired**.\n\n` +
                    `Premium features have been disabled. Contact the bot owner to renew.`
                  )
                  .setTimestamp()],
              }).catch(() => {});
            }
          }
        }
      } catch {}
    }
  } catch (err) {
    console.error("[Premium] Expiry check error:", err.message);
  }
}

module.exports = {
  isPremium,
  getPremiumRecord,
  getPremiumLimit,
  premiumEmbed,
  formatExpiry,
  getDurationMs,
  getDurationChoices,
  checkPremiumExpiry,
};
