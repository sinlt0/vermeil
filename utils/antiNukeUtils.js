// ============================================================
//  utils/antiNukeUtils.js
//  Core antinuke helpers:
//  - getConfig / ensureConfig
//  - isImmune (permit checks)
//  - isWhitelisted
//  - quarantineMember / unquarantineMember
//  - sendAnLog (antinuke log channel)
//  - getActionTracker (in-memory rate tracker)
//  - triggerPanicMode / endPanicMode
// ============================================================
const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require("discord.js");
const e = require("../emojis/antinukeemoji");

const { fromConnection: AntiNukeConfig }    = require("../models/AntiNukeConfig");
const { fromConnection: AntiNukeLog }       = require("../models/AntiNukeLog");
const { fromConnection: AntiNukePermit }    = require("../models/AntiNukePermit");
const { fromConnection: AntiNukeWhitelist } = require("../models/AntiNukeWhitelist");
const { fromConnection: QuarantineEntry }   = require("../models/QuarantineEntry");

// ── In-memory action tracker ──────────────────────────────
// Map<guildId_userId_filterType, [timestamps]>
const actionTracker = new Map();

// ── Dangerous permissions list ────────────────────────────
const DANGEROUS_PERMS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.ModerateMembers,
];

function hasDangerousPerm(permissions) {
  return DANGEROUS_PERMS.some(p => (BigInt(permissions) & p) === p);
}

// ============================================================
//  Get or create antinuke config for a guild
// ============================================================
async function getConfig(client, guildId) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;
  const ConfigModel = AntiNukeConfig(guildDb.connection);
  return ConfigModel.findOne({ guildId });
}

async function ensureConfig(client, guildId) {
  const guildDb = await client.db.getGuildDb(guildId);
  if (!guildDb || guildDb.isDown) return null;
  const ConfigModel = AntiNukeConfig(guildDb.connection);
  let config = await ConfigModel.findOne({ guildId });
  if (!config) config = await ConfigModel.create({ guildId });
  return config;
}

// ============================================================
//  Check if a user is immune (physical owner, extra owner, trusted admin)
// ============================================================
async function isImmune(client, guild, userId) {
  // Physical server owner is always immune
  if (guild.ownerId === userId) return { immune: true, level: "owner" };

  // Bot itself is always immune
  if (userId === client.user.id) return { immune: true, level: "bot" };

  // Bot owner/devs are immune
  if (userId === client.config.ownerID) return { immune: true, level: "bot_owner" };
  if (client.config.devIDs?.includes(userId)) return { immune: true, level: "bot_dev" };

  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return { immune: false };

  const PermitModel = AntiNukePermit(guildDb.connection);
  const permit      = await PermitModel.findOne({ guildId: guild.id, userId }).lean();

  if (!permit) return { immune: false };
  return { immune: true, level: permit.level };
}

// ============================================================
//  Check if a target is whitelisted for a specific type
// ============================================================
async function isWhitelisted(client, guild, targetId, type) {
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return false;

  const WLModel = AntiNukeWhitelist(guildDb.connection);
  const entry   = await WLModel.findOne({ guildId: guild.id, targetId }).lean();
  if (!entry) return false;

  return entry.types.includes("total") ||
         entry.types.includes(type)    ||
         (type === "antinuke" && entry.types.includes("total"));
}

// ============================================================
//  Track action rate — returns true if limit exceeded
// ============================================================
function trackAction(guildId, userId, filterType, limit, windowMs) {
  const key  = `${guildId}_${userId}_${filterType}`;
  const now  = Date.now();

  if (!actionTracker.has(key)) actionTracker.set(key, []);

  // Remove old entries outside the window
  const timestamps = actionTracker.get(key).filter(t => now - t < windowMs);
  timestamps.push(now);
  actionTracker.set(key, timestamps);

  // Auto-cleanup after window expires
  setTimeout(() => {
    const current = actionTracker.get(key);
    if (current && current.length === 0) actionTracker.delete(key);
  }, windowMs + 100);

  return timestamps.length >= limit;
}

function clearActionTrack(guildId, userId, filterType) {
  const key = `${guildId}_${userId}_${filterType}`;
  actionTracker.delete(key);
}

// ============================================================
//  Quarantine a member
//  - Removes all their roles
//  - Saves roles to DB for potential restore
//  - Assigns quarantine role
// ============================================================
async function quarantineMember(client, guild, member, reason, filter, automated = true) {
  try {
    const config = await getConfig(client, guild.id);
    if (!config?.quarantineRoleId) return { success: false, reason: "No quarantine role set." };

    const quarantineRole = guild.roles.cache.get(config.quarantineRoleId);
    if (!quarantineRole) return { success: false, reason: "Quarantine role not found." };

    // Save current roles (excluding @everyone and managed roles)
    const savedRoles = member.roles.cache
      .filter(r => r.id !== guild.id && !r.managed)
      .map(r => r.id);

    // Remove all roles
    try {
      await member.roles.set([quarantineRole]);
    } catch {
      // If we can't set roles, at least add quarantine
      await member.roles.add(quarantineRole).catch(() => {});
    }

    // Save to DB
    const guildDb      = await client.db.getGuildDb(guild.id);
    const QModel       = QuarantineEntry(guildDb.connection);
    await QModel.findOneAndUpdate(
      { guildId: guild.id, userId: member.id },
      { $set: {
          guildId:       guild.id,
          userId:        member.id,
          userTag:       member.user.tag,
          reason,
          filter,
          quarantinedBy: automated ? "AUTO" : "MANUAL",
          savedRoles,
          quarantinedAt: new Date(),
        }
      },
      { upsert: true }
    );

    // Log the action
    await logAction(client, guild, {
      action:      "QUARANTINE",
      filter,
      targetId:    member.id,
      targetTag:   member.user.tag,
      reason,
      automated,
      severity:    "critical",
    });

    // Notify the server owner via DM
    const owner = await guild.fetchOwner().catch(() => null);
    if (owner && owner.id !== member.id) {
      await owner.user.send({
        embeds: [new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`${e.alert} Antinuke Alert — ${guild.name}`)
          .setDescription(
            `${e.quarantine} **${member.user.tag}** has been quarantined!\n\n` +
            `**Reason:** ${reason}\n` +
            `**Filter:** ${filter ?? "Manual"}\n` +
            `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
          )
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp()],
      }).catch(() => {});
    }

    return { success: true, savedRoles };
  } catch (err) {
    console.error("[AntiNuke] quarantineMember error:", err.message);
    return { success: false, reason: err.message };
  }
}

// ============================================================
//  Unquarantine a member
// ============================================================
async function unquarantineMember(client, guild, member, executorId) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    const QModel  = QuarantineEntry(guildDb.connection);
    const entry   = await QModel.findOne({ guildId: guild.id, userId: member.id });

    if (!entry) return { success: false, reason: "User is not in quarantine." };

    // Restore saved roles
    const rolesToRestore = entry.savedRoles
      .map(id => guild.roles.cache.get(id))
      .filter(Boolean)
      .filter(r => r.position < guild.members.me.roles.highest.position);

    if (rolesToRestore.length > 0) {
      await member.roles.set(rolesToRestore).catch(() => {});
    } else {
      // Remove quarantine role at minimum
      const config = await getConfig(client, guild.id);
      if (config?.quarantineRoleId) {
        await member.roles.remove(config.quarantineRoleId).catch(() => {});
      }
    }

    await QModel.deleteOne({ guildId: guild.id, userId: member.id });

    await logAction(client, guild, {
      action:      "UNQUARANTINE",
      targetId:    member.id,
      targetTag:   member.user.tag,
      executorId,
      reason:      "Manually unquarantined",
      automated:   false,
      severity:    "low",
    });

    return { success: true };
  } catch (err) {
    console.error("[AntiNuke] unquarantineMember error:", err.message);
    return { success: false, reason: err.message };
  }
}

// ============================================================
//  Log an antinuke action to the log channel + DB
// ============================================================
async function logAction(client, guild, {
  action, filter = null, targetId = null, targetTag = null,
  executorId = null, executorTag = null, reason = null,
  details = null, automated = true, severity = "high",
}) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    // Save to DB
    const LogModel = AntiNukeLog(guildDb.connection);
    await LogModel.create({
      guildId: guild.id, action, filter, targetId, targetTag,
      executorId, executorTag, reason, details, automated, severity,
    });

    // Send to log channel
    const config = await AntiNukeConfig(guildDb.connection).findOne({ guildId: guild.id }).lean();
    if (!config?.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const severityColor = { critical: 0xED4245, high: 0xFF7043, medium: 0xFEE75C, low: 0x57F287 };
    const severityEmoji = { critical: e.critical, high: e.high, medium: e.medium, low: e.low };

    const embed = new EmbedBuilder()
      .setColor(severityColor[severity] ?? 0xED4245)
      .setTitle(`${severityEmoji[severity]} ${action.replace(/_/g, " ")}`)
      .setDescription(
        [
          filter     ? `${e.shield} **Filter:** ${filter}` : null,
          targetTag  ? `${e.suspect} **Target:** ${targetTag} (\`${targetId}\`)` : null,
          executorTag? `${e.owner} **Executor:** ${executorTag} (\`${executorId}\`)` : null,
          reason     ? `${e.info} **Reason:** ${reason}` : null,
          details    ? `${e.info} **Details:** ${JSON.stringify(details)}` : null,
          `${e.timer} **Time:** <t:${Math.floor(Date.now() / 1000)}:F>`,
          `${automated ? `${e.on} Automated` : `${e.edit} Manual`}`,
        ].filter(Boolean).join("\n")
      )
      .setFooter({ text: `Antinuke • ${guild.name}`, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
  } catch {}
}

// ============================================================
//  Trigger Panic Mode
//  - Removes dangerous permissions from ALL roles
//  - Locks all channels from everyone except bot
//  - Pings panic roles
// ============================================================
async function triggerPanicMode(client, guild, reason, triggeredBy = "AUTO") {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    const config  = await AntiNukeConfig(guildDb.connection).findOne({ guildId: guild.id });
    if (!config) return;

    // Update panic state in DB
    await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
      { guildId: guild.id },
      { $set: {
          "panicMode.active":      true,
          "panicMode.triggeredAt": new Date(),
          "panicMode.triggeredBy": triggeredBy,
          "panicMode.reason":      reason,
        }
      }
    );

    // Lock all channels — deny everyone from sending messages
    const lockPromises = [];
    for (const [, channel] of guild.channels.cache) {
      if (channel.type === 4) continue; // skip categories
      lockPromises.push(
        channel.permissionOverwrites.edit(guild.id, {
          SendMessages: false,
          AddReactions: false,
        }).catch(() => {})
      );
    }
    await Promise.allSettled(lockPromises);

    // Strip dangerous permissions from all non-managed roles
    for (const [, role] of guild.roles.cache) {
      if (role.managed || role.id === guild.id) continue;
      if (role.position >= guild.members.me.roles.highest.position) continue;
      try {
        const newPerms = role.permissions.remove(DANGEROUS_PERMS);
        if (newPerms.bitfield !== role.permissions.bitfield) {
          await role.setPermissions(newPerms).catch(() => {});
        }
      } catch {}
    }

    // Ping panic roles
    if (config.panicPingRoles?.length) {
      const logCh = guild.channels.cache.get(config.logChannelId ?? config.modLogChannelId);
      if (logCh) {
        const mentions = config.panicPingRoles.map(id => `<@&${id}>`).join(" ");
        await logCh.send({
          content: mentions,
          embeds: [new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`${e.panicOn} PANIC MODE ACTIVATED`)
            .setDescription(
              `**${guild.name}** is under attack!\n\n` +
              `${e.lockdown} All channels have been locked.\n` +
              `${e.permission} Dangerous permissions removed from all roles.\n\n` +
              `**Reason:** ${reason}\n` +
              `**Triggered by:** ${triggeredBy === "AUTO" ? "Antinuke System" : `<@${triggeredBy}>`}`
            )
            .setTimestamp()],
        }).catch(() => {});
      }
    }

    await logAction(client, guild, {
      action:    "PANIC_MODE_ON",
      reason,
      executorId: triggeredBy === "AUTO" ? client.user.id : triggeredBy,
      automated:  triggeredBy === "AUTO",
      severity:  "critical",
    });

    console.error(`[AntiNuke] 🆘 PANIC MODE triggered in ${guild.name}: ${reason}`);
  } catch (err) {
    console.error("[AntiNuke] triggerPanicMode error:", err.message);
  }
}

// ============================================================
//  End Panic Mode
// ============================================================
async function endPanicMode(client, guild, executorId) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
      { guildId: guild.id },
      { $set: {
          "panicMode.active":      false,
          "panicMode.triggeredAt": null,
          "panicMode.triggeredBy": null,
          "panicMode.reason":      null,
        }
      }
    );

    // Unlock all channels
    const unlockPromises = [];
    for (const [, channel] of guild.channels.cache) {
      if (channel.type === 4) continue;
      unlockPromises.push(
        channel.permissionOverwrites.edit(guild.id, {
          SendMessages: null,
          AddReactions: null,
        }).catch(() => {})
      );
    }
    await Promise.allSettled(unlockPromises);

    await logAction(client, guild, {
      action:    "PANIC_MODE_OFF",
      executorId,
      reason:    "Panic mode ended",
      automated: false,
      severity:  "low",
    });
  } catch (err) {
    console.error("[AntiNuke] endPanicMode error:", err.message);
  }
}

module.exports = {
  DANGEROUS_PERMS,
  hasDangerousPerm,
  getConfig,
  ensureConfig,
  isImmune,
  isWhitelisted,
  trackAction,
  clearActionTrack,
  quarantineMember,
  unquarantineMember,
  logAction,
  triggerPanicMode,
  endPanicMode,
};
