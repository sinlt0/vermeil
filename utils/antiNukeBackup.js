// ============================================================
//  utils/antiNukeBackup.js
//  Server backup and restore logic
// ============================================================
const { EmbedBuilder, ChannelType } = require("discord.js");
const { fromConnection: AntiNukeBackup } = require("../models/AntiNukeBackup");
const { logAction } = require("./antiNukeUtils");

const MAX_BACKUPS = 10;

// ============================================================
//  Take a full server backup
// ============================================================
async function takeBackup(client, guild, label = "Auto Backup", createdBy = null) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return null;

    const BackupModel = AntiNukeBackup(guildDb.connection);

    // Snapshot channels
    const channels = [];
    for (const [, ch] of guild.channels.cache) {
      const overrides = ch.permissionOverwrites?.cache.map(o => ({
        id:    o.id,
        type:  o.type,
        allow: o.allow.bitfield.toString(),
        deny:  o.deny.bitfield.toString(),
      })) ?? [];

      channels.push({
        id:               ch.id,
        name:             ch.name,
        type:             ch.type,
        position:         ch.position,
        parentId:         ch.parentId ?? null,
        topic:            ch.topic ?? null,
        nsfw:             ch.nsfw ?? false,
        rateLimitPerUser: ch.rateLimitPerUser ?? 0,
        permissionOverwrites: overrides,
      });
    }

    // Snapshot roles
    const roles = [];
    for (const [, role] of guild.roles.cache) {
      if (role.managed) continue; // skip bot/integration roles
      roles.push({
        id:          role.id,
        name:        role.name,
        color:       role.color,
        hoist:       role.hoist,
        position:    role.position,
        permissions: role.permissions.bitfield.toString(),
        mentionable: role.mentionable,
        managed:     role.managed,
      });
    }

    const backup = await BackupModel.create({
      guildId:      guild.id,
      label,
      createdBy,
      name:         guild.name,
      icon:         guild.iconURL({ dynamic: true }),
      verificationLevel: guild.verificationLevel,
      channels,
      roles,
      channelCount: channels.length,
      roleCount:    roles.length,
      automated:    createdBy === null,
    });

    // Enforce max 10 backups per guild
    const count = await BackupModel.countDocuments({ guildId: guild.id });
    if (count > MAX_BACKUPS) {
      const oldest = await BackupModel
        .find({ guildId: guild.id })
        .sort({ createdAt: 1 })
        .limit(count - MAX_BACKUPS);
      for (const old of oldest) await BackupModel.deleteOne({ _id: old._id });
    }

    await logAction(client, guild, {
      action:    "BACKUP_TAKEN",
      reason:    label,
      executorId: createdBy ?? client.user.id,
      automated: createdBy === null,
      severity:  "low",
      details:   { channels: channels.length, roles: roles.length },
    });

    return backup;
  } catch (err) {
    console.error("[AntiNuke] takeBackup error:", err.message);
    return null;
  }
}

// ============================================================
//  Restore a backup — only restores AFFECTED items
// ============================================================
async function restoreBackup(client, guild, backupId, executorId) {
  try {
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return { success: false, reason: "DB unavailable." };

    const BackupModel = AntiNukeBackup(guildDb.connection);
    const backup      = await BackupModel.findOne({ _id: backupId, guildId: guild.id });
    if (!backup) return { success: false, reason: "Backup not found." };

    let restoredChannels = 0;
    let restoredRoles    = 0;

    // Restore roles that were deleted or had permissions changed
    for (const savedRole of backup.roles) {
      if (savedRole.id === guild.id) continue; // skip @everyone restore

      const existing = guild.roles.cache.get(savedRole.id);
      if (!existing) continue; // can't recreate roles with same ID after delete

      try {
        const currentPerms = existing.permissions.bitfield.toString();
        if (currentPerms !== savedRole.permissions) {
          await existing.setPermissions(BigInt(savedRole.permissions));
          restoredRoles++;
        }
      } catch {}
    }

    // Restore channel permission overwrites
    for (const savedCh of backup.channels) {
      const existing = guild.channels.cache.get(savedCh.id);
      if (!existing) continue;

      try {
        for (const override of savedCh.permissionOverwrites) {
          await existing.permissionOverwrites.edit(override.id, {
            allow: BigInt(override.allow),
            deny:  BigInt(override.deny),
          }).catch(() => {});
        }
        restoredChannels++;
      } catch {}
    }

    await logAction(client, guild, {
      action:    "BACKUP_RESTORED",
      reason:    `Backup: ${backup.label}`,
      executorId,
      automated: false,
      severity:  "medium",
      details:   { restoredChannels, restoredRoles, backupId: backup._id.toString() },
    });

    return { success: true, restoredChannels, restoredRoles };
  } catch (err) {
    console.error("[AntiNuke] restoreBackup error:", err.message);
    return { success: false, reason: err.message };
  }
}

// ============================================================
//  Start auto-backup scheduler (every 3 hours)
// ============================================================
function startAutoBackup(client) {
  setInterval(async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      try {
        const guildDb = await client.db.getGuildDb(guildId);
        if (!guildDb || guildDb.isDown) continue;

        const { fromConnection: AntiNukeConfig } = require("../models/AntiNukeConfig");
        const config = await AntiNukeConfig(guildDb.connection).findOne({ guildId }).lean();
        if (!config?.enabled) continue;

        await takeBackup(client, guild, "Auto Backup (3h)", null);
      } catch {}
    }
  }, 3 * 60 * 60 * 1000); // every 3 hours
}

module.exports = { takeBackup, restoreBackup, startAutoBackup };
