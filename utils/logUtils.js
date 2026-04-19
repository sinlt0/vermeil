// ============================================================
//  utils/logUtils.js
//  Core logging utility
//  - getLogConfig / ensureLogConfig
//  - getOrCreateWebhook (reuse existing webhook in channel)
//  - sendLog (dispatch embed via webhook)
//  - CATEGORY_META (colors, emoji, labels)
// ============================================================
const { EmbedBuilder, WebhookClient, PermissionFlagsBits } = require("discord.js");
const { fromConnection: LogConfig }       = require("../models/LogConfig");
const { fromConnection: AntiNukeConfig }  = require("../models/AntiNukeConfig");
const { fromConnection: AutoModConfig }   = require("../models/AutoModConfig");

// ── Category metadata ─────────────────────────────────────
const CATEGORY_META = {
  mod:      { label: "Mod Logs",       emoji: "📜", color: 0xED4245 },
  antinuke: { label: "Antinuke Logs",  emoji: "🛡️", color: 0x8b5cf6 },
  automod:  { label: "Automod Logs",   emoji: "🤖", color: 0xFEE75C },
  member:   { label: "Member Logs",    emoji: "👤", color: 0x57F287 },
  message:  { label: "Message Logs",   emoji: "💬", color: 0x5865F2 },
  server:   { label: "Server Logs",    emoji: "⚙️", color: 0xFF9800 },
  voice:    { label: "Voice Logs",     emoji: "🔊", color: 0x1DB954 },
  invite:   { label: "Invite Logs",    emoji: "🔗", color: 0x00BCD4 },
  thread:   { label: "Thread Logs",    emoji: "🧵", color: 0xFF6B9D },
  webhook:  { label: "Webhook Logs",   emoji: "🪝", color: 0x607D8B },
  emoji:    { label: "Emoji Logs",     emoji: "😀", color: 0xFFD700 },
  boost:    { label: "Boost Logs",     emoji: "💎", color: 0xF47FFF },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

// ============================================================
//  Get or create LogConfig
// ============================================================
async function getLogConfig(client, guildId) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;
  return LogConfig(guildDb.connection).findOne({ guildId });
}

async function ensureLogConfig(client, guildId) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;
  const Model  = LogConfig(guildDb.connection);
  let config   = await Model.findOne({ guildId });
  if (!config) config = await Model.create({ guildId });
  return config;
}

// ============================================================
//  Get or create a webhook in a channel
//  Reuses existing webhook if already created for that channel
// ============================================================
async function getOrCreateWebhook(client, guild, channel, config, guildDb) {
  const LogModel = LogConfig(guildDb.connection);

  // Check if we already have a webhook for this channel
  const existing = config.webhooks?.get(channel.id);
  if (existing) {
    try {
      // Validate it still exists
      const wh = new WebhookClient({ id: existing.webhookId, token: existing.webhookToken });
      await wh.fetchMessage("@original").catch(() => {}); // just a validation ping
      return wh;
    } catch {
      // Webhook no longer valid — recreate below
    }
  }

  // Check if bot can manage webhooks in this channel
  if (!channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ManageWebhooks)) {
    return null;
  }

  // Create a new webhook
  const botName  = client.user.username;
  const webhook  = await channel.createWebhook({
    name:   `${botName} Bot Logging`,
    avatar: client.user.displayAvatarURL({ extension: "png", size: 256 }),
    reason: "Log system webhook",
  });

  // Save webhook info
  await LogModel.findOneAndUpdate(
    { guildId: guild.id },
    {
      $set: {
        [`webhooks.${channel.id}`]: {
          channelId:    channel.id,
          webhookId:    webhook.id,
          webhookToken: webhook.token,
        }
      }
    }
  );

  return new WebhookClient({ id: webhook.id, token: webhook.token });
}

// ============================================================
//  Send a log embed via webhook
// ============================================================
async function sendLog(client, guild, category, embed) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const LogModel = LogConfig(guildDb.connection);
    const config   = await LogModel.findOne({ guildId: guild.id });
    if (!config) return;

    const cat = config.categories?.[category];
    if (!cat?.enabled || !cat?.channelId) return;

    const channel = guild.channels.cache.get(cat.channelId);
    if (!channel) return;

    // Get or create webhook
    let webhookClient;
    const wh = config.webhooks?.get(cat.channelId);
    if (wh) {
      webhookClient = new WebhookClient({ id: wh.webhookId, token: wh.webhookToken });
    } else {
      webhookClient = await getOrCreateWebhook(client, guild, channel, config, guildDb);
    }

    if (!webhookClient) {
      // Fallback: send directly to channel
      await channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    const meta = CATEGORY_META[category];
    await webhookClient.send({
      username:  `${client.user.username} Bot Logging`,
      avatarURL: client.user.displayAvatarURL({ extension: "png" }),
      embeds:    [embed],
    }).catch(async (err) => {
      // Webhook deleted — recreate and retry
      if (err.code === 10015) {
        await LogModel.findOneAndUpdate(
          { guildId: guild.id },
          { $unset: { [`webhooks.${cat.channelId}`]: "" } }
        );
        const newWh = await getOrCreateWebhook(client, guild, channel, config, guildDb);
        if (newWh) {
          await newWh.send({
            username:  `${client.user.username} Bot Logging`,
            avatarURL: client.user.displayAvatarURL({ extension: "png" }),
            embeds:    [embed],
          }).catch(() => {});
        }
      }
    });

  } catch (err) {
    console.error(`[Logs] sendLog error (${category}):`, err.message);
  }
}

// ============================================================
//  Set a category's channel + create webhook
// ============================================================
async function setCategoryChannel(client, guild, category, channel) {
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return { success: false, reason: "DB unavailable." };

  const config = await ensureLogConfig(client, guild.id);
  if (!config)  return { success: false, reason: "Could not create config." };

  // Create/get webhook for this channel
  const webhook = await getOrCreateWebhook(client, guild, channel, config, guildDb);

  const LogModel = LogConfig(guildDb.connection);
  await LogModel.findOneAndUpdate(
    { guildId: guild.id },
    {
      $set: {
        [`categories.${category}.channelId`]: channel.id,
        [`categories.${category}.enabled`]:   true,
      }
    }
  );

  // Sync to antinuke if category is antinuke
  if (category === "antinuke") {
    const { fromConnection: ANConfig } = require("../models/AntiNukeConfig");
    await ANConfig(guildDb.connection).findOneAndUpdate(
      { guildId: guild.id },
      { $set: { logChannelId: channel.id } }
    );
  }

  // Sync to automod if category is automod
  if (category === "automod") {
    const { fromConnection: AMConfig } = require("../models/AutoModConfig");
    await AMConfig(guildDb.connection).findOneAndUpdate(
      { guildId: guild.id },
      { $set: { logChannelId: channel.id } }
    );
  }

  return { success: true, hasWebhook: !!webhook };
}

// ============================================================
//  Toggle a category on/off
// ============================================================
async function toggleCategory(client, guildId, category, enabled) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return false;
  const LogModel = LogConfig(guildDb.connection);
  await LogModel.findOneAndUpdate(
    { guildId },
    { $set: { [`categories.${category}.enabled`]: enabled } }
  );
  return true;
}

module.exports = {
  CATEGORY_META,
  ALL_CATEGORIES,
  getLogConfig,
  ensureLogConfig,
  getOrCreateWebhook,
  sendLog,
  setCategoryChannel,
  toggleCategory,
};
