// ============================================================
//  utils/automod/automodUtils.js
//  Core automod helpers used across all filter events
// ============================================================
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { fromConnection: AutoModConfig }    = require("../../models/AutoModConfig");
const { fromConnection: UserHeat }         = require("../../models/UserHeat");
const { fromConnection: AntiNukeWhitelist }= require("../../models/AntiNukeWhitelist");
const { addHeat, resetHeat, calcTimeoutDuration, heatBar } = require("./heatEngine");
const e = require("../../emojis/automodemoji");

// ============================================================
//  Get or create automod config
// ============================================================
async function getConfig(client, guildId) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;
  const ConfigModel = AutoModConfig(guildDb.connection);
  return ConfigModel.findOne({ guildId });
}

async function ensureConfig(client, guildId) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;
  const ConfigModel = AutoModConfig(guildDb.connection);
  let config = await ConfigModel.findOne({ guildId });
  if (!config) config = await ConfigModel.create({ guildId });
  return config;
}

// ============================================================
//  Check if a target is whitelisted for automod
// ============================================================
async function isAutomodWhitelisted(client, guild, member) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return false;

    const WLModel = AntiNukeWhitelist(guildDb.connection);

    // Check user directly
    const userEntry = await WLModel.findOne({ guildId: guild.id, targetId: member.id }).lean();
    if (userEntry && (userEntry.types.includes("automod") || userEntry.types.includes("total"))) return true;

    // Check user's roles
    for (const [roleId] of member.roles.cache) {
      const roleEntry = await WLModel.findOne({ guildId: guild.id, targetId: roleId }).lean();
      if (roleEntry && (roleEntry.types.includes("automod") || roleEntry.types.includes("total"))) return true;
    }

    // Check channel
    if (member.channel) {
      const chEntry = await WLModel.findOne({ guildId: guild.id, targetId: member.channel.id }).lean();
      if (chEntry && (chEntry.types.includes("automod") || chEntry.types.includes("total"))) return true;
    }

    return false;
  } catch {
    return false;
  }
}

// ============================================================
//  Check if message channel is whitelisted
// ============================================================
async function isChannelWhitelisted(client, guild, channelId, type = "spam") {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return false;
    const WLModel = AntiNukeWhitelist(guildDb.connection);
    const entry   = await WLModel.findOne({ guildId: guild.id, targetId: channelId }).lean();
    if (!entry) return false;
    return entry.types.includes("total") || entry.types.includes("automod") || entry.types.includes(type);
  } catch {
    return false;
  }
}

// ============================================================
//  Apply punishment to a member
// ============================================================
async function applyPunishment(client, guild, member, config, action, reason, strikeCount) {
  try {
    // Can't punish bots, owner, or immune users
    if (member.user.bot) return false;
    if (member.id === guild.ownerId) return false;
    if (!guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) return false;

    const durationSecs = calcTimeoutDuration(config, strikeCount);

    if (action === "timeout") {
      const maxTimeout = 28 * 24 * 60 * 60 * 1000; // 28 days Discord max
      const duration   = Math.min(durationSecs * 1000, maxTimeout);
      await member.timeout(duration, reason);
    } else if (action === "kick") {
      await member.kick(reason);
    } else if (action === "ban") {
      await guild.members.ban(member.id, { reason, deleteMessageSeconds: 86400 });
    }

    return true;
  } catch (err) {
    console.error("[AutoMod] applyPunishment error:", err.message);
    return false;
  }
}

// ============================================================
//  Send automod log to the log channel
// ============================================================
async function sendAutomodLog(client, guild, {
  filter, member, reason, heat = null,
  strikeCount = 0, action, deleted = false, extra = null,
}) {
  try {
    const config = await getConfig(client, guild.id);
    if (!config?.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const isCapStrike = strikeCount >= (config.heat.capCount ?? 3);
    const color       = isCapStrike ? 0xED4245 : (strikeCount > 1 ? 0xFF7043 : 0xFEE75C);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${e.trigger} AutoMod Triggered — ${filter}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: `${e.user} User`,    value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: `${e.timeout} Action`, value: action,                                 inline: true },
        { name: `${e.strike} Strike`,  value: `#${strikeCount}${isCapStrike ? " 🚨 **CAP**" : ""}`, inline: true },
        { name: `${e.info} Reason`,  value: reason,                                  inline: false },
        ...(heat !== null ? [{ name: `${e.heat} Heat`, value: heatBar(heat), inline: false }] : []),
        ...(extra ? [{ name: `${e.info} Details`, value: extra, inline: false }] : []),
        { name: `${e.delete} Deleted`, value: deleted ? "Yes" : "No",               inline: true },
        { name: `${e.time} Time`,    value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      )
      .setFooter({ text: `AutoMod • ${guild.name}` })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  Full automod handler — add heat, check trigger, punish
// ============================================================
async function handleHeat(client, message, filterName, heatAmount, reason) {
  try {
    const guild  = message.guild;
    const member = message.member;
    if (!member || member.user.bot) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const config = await AutoModConfig(guildDb.connection).findOne({ guildId: guild.id });
    if (!config?.enabled) return;

    // Add heat
    const { heat, triggered, record } = await addHeat(
      guildDb.connection, config, guild.id, member.id, heatAmount
    );

    if (!triggered) return;

    const strikeCount = record.strikeCount;
    const action      = config.punishment.action ?? "timeout";

    // Delete message if configured
    let deleted = false;
    if (config.filters.deleteOnTrigger && message.deletable) {
      await message.delete().catch(() => {});
      deleted = true;
    }

    // Apply punishment
    await applyPunishment(client, guild, member, config, action, reason, strikeCount);

    // Reset heat after punishment
    await resetHeat(guildDb.connection, guild.id, member.id);

    // Log it
    await sendAutomodLog(client, guild, {
      filter: filterName,
      member,
      reason,
      heat,
      strikeCount,
      action,
      deleted,
    });

    // DM the user
    await member.user.send({
      embeds: [new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${e.warning} AutoMod — ${guild.name}`)
        .setDescription(
          `You were punished for violating server rules.\n\n` +
          `**Filter:** ${filterName}\n` +
          `**Reason:** ${reason}\n` +
          `**Action:** ${action}\n` +
          `**Strike:** #${strikeCount}`
        )
        .setTimestamp()],
    }).catch(() => {});

  } catch (err) {
    console.error("[AutoMod] handleHeat error:", err.message);
  }
}

// ============================================================
//  Instant punishment — bypass heat (for invites, links etc.)
// ============================================================
async function instantPunish(client, message, filterName, action, reason) {
  try {
    const guild  = message.guild;
    const member = message.member;
    if (!member || member.user.bot) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const config = await AutoModConfig(guildDb.connection).findOne({ guildId: guild.id });
    if (!config?.enabled) return;

    // Delete message
    let deleted = false;
    if (message.deletable) {
      await message.delete().catch(() => {});
      deleted = true;
    }

    // Apply punishment
    const HeatModel  = require("../../models/UserHeat").fromConnection(guildDb.connection);
    const heatRecord = await HeatModel.findOne({ guildId: guild.id, userId: member.id });
    const strikes    = (heatRecord?.strikeCount ?? 0) + 1;
    await HeatModel.findOneAndUpdate(
      { guildId: guild.id, userId: member.id },
      { $set: { strikeCount: strikes, lastStrike: new Date() } },
      { upsert: true }
    );

    await applyPunishment(client, guild, member, config, action, reason, strikes);

    await sendAutomodLog(client, guild, {
      filter: filterName, member, reason,
      strikeCount: strikes, action, deleted,
    });

    await member.user.send({
      embeds: [new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${e.error} AutoMod — ${guild.name}`)
        .setDescription(
          `You were punished for posting prohibited content.\n\n` +
          `**Filter:** ${filterName}\n` +
          `**Reason:** ${reason}\n` +
          `**Action:** ${action}`
        )
        .setTimestamp()],
    }).catch(() => {});

  } catch (err) {
    console.error("[AutoMod] instantPunish error:", err.message);
  }
}

module.exports = {
  getConfig,
  ensureConfig,
  isAutomodWhitelisted,
  isChannelWhitelisted,
  applyPunishment,
  sendAutomodLog,
  handleHeat,
  instantPunish,
};
