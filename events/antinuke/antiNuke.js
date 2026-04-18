// ============================================================
//  events/guild/antiNuke.js
//  The main antinuke monitor — listens to guildAuditLogEntry
//  Detects all nuke actions and quarantines the executor
// ============================================================
const { AuditLogEvent, PermissionFlagsBits } = require("discord.js");
const {
  getConfig, isImmune, isWhitelisted,
  trackAction, quarantineMember,
  logAction, triggerPanicMode,
  hasDangerousPerm, DANGEROUS_PERMS,
} = require("../../utils/antiNukeUtils");

module.exports = {
  name: "guildAuditLogEntryCreate",
  once: false,

  async execute(client, auditEntry, guild) {
    try {
      if (!guild || !client.db) return;

      const config = await getConfig(client, guild.id);
      if (!config?.enabled) return;

      // Ignore if panic mode already active
      if (config.panicMode?.active) return;

      const executorId = auditEntry.executor?.id;
      if (!executorId) return;

      // Check immunity first — ignore immune users completely
      const immunity = await isImmune(client, guild, executorId);
      if (immunity.immune) return;

      // Get executor member
      const executor = await guild.members.fetch(executorId).catch(() => null);
      if (!executor) return;

      const action = auditEntry.action;

      // ── FILTER 2 — Mass Channel Delete/Create ────────────
      if (
        config.filters.massChannel.enabled &&
        (action === AuditLogEvent.ChannelCreate || action === AuditLogEvent.ChannelDelete)
      ) {
        const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
        if (!whitelisted) {
          const type      = action === AuditLogEvent.ChannelDelete ? "channel_delete" : "channel_create";
          const exceeded  = trackAction(
            guild.id, executorId, type,
            config.filters.massChannel.limit,
            config.filters.massChannel.timeWindow
          );

          if (exceeded) {
            await handleViolation(client, guild, executor, config, {
              reason: `Mass channel ${action === AuditLogEvent.ChannelDelete ? "deletion" : "creation"} detected (${config.filters.massChannel.limit} in ${config.filters.massChannel.timeWindow / 1000}s)`,
              filter: action === AuditLogEvent.ChannelDelete ? "MASS_CHANNEL_DELETE" : "MASS_CHANNEL_CREATE",
            });
          }
        }
      }

      // ── FILTER 3 — Mass Role Delete/Create ───────────────
      if (
        config.filters.massRole.enabled &&
        (action === AuditLogEvent.RoleCreate || action === AuditLogEvent.RoleDelete)
      ) {
        const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
        if (!whitelisted) {
          const type     = action === AuditLogEvent.RoleDelete ? "role_delete" : "role_create";
          const exceeded = trackAction(
            guild.id, executorId, type,
            config.filters.massRole.limit,
            config.filters.massRole.timeWindow
          );

          if (exceeded) {
            await handleViolation(client, guild, executor, config, {
              reason: `Mass role ${action === AuditLogEvent.RoleDelete ? "deletion" : "creation"} detected`,
              filter: action === AuditLogEvent.RoleDelete ? "MASS_ROLE_DELETE" : "MASS_ROLE_CREATE",
            });
          }
        }
      }

      // ── FILTER 4a — Prune Protection ─────────────────────
      if (config.filters.pruneProtection.enabled && action === AuditLogEvent.MemberPrune) {
        const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
        if (!whitelisted) {
          await handleViolation(client, guild, executor, config, {
            reason: `Member prune detected (${auditEntry.extra?.removed ?? "?"} members pruned)`,
            filter: "PRUNE",
          });
        }
      }

      // ── FILTER 4b — Quarantine Hold ───────────────────────
      // Detects anyone trying to give/remove roles from quarantined members
      if (config.filters.quarantineHold.enabled && action === AuditLogEvent.MemberRoleUpdate) {
        const targetId = auditEntry.target?.id;
        if (targetId) {
          const { fromConnection: QuarantineEntry } = require("../../models/QuarantineEntry");
          const guildDb   = await client.db.getGuildDb(guild.id);
          const QModel    = QuarantineEntry(guildDb.connection);
          const isQ       = await QModel.findOne({ guildId: guild.id, userId: targetId }).lean();

          if (isQ) {
            const whitelisted = await isWhitelisted(client, guild, executorId, "quarantine");
            if (!whitelisted) {
              await handleViolation(client, guild, executor, config, {
                reason: `Attempted to modify roles of a quarantined member`,
                filter: "QUARANTINE_HOLD",
              });
            }
          }
        }
      }

      // ── FILTER 5a — Mass Ban/Kick ─────────────────────────
      if (
        config.filters.massBanKick.enabled &&
        (action === AuditLogEvent.MemberBanAdd || action === AuditLogEvent.MemberKick)
      ) {
        const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
        if (!whitelisted) {
          const type     = action === AuditLogEvent.MemberBanAdd ? "ban" : "kick";
          const exceeded = trackAction(
            guild.id, executorId, type,
            config.filters.massBanKick.limit,
            config.filters.massBanKick.timeWindow
          );

          if (exceeded) {
            await handleViolation(client, guild, executor, config, {
              reason: `Mass ${type} detected`,
              filter: action === AuditLogEvent.MemberBanAdd ? "MASS_BAN" : "MASS_KICK",
            });
          }
        }
      }

      // ── FILTER 5b — Strict Mode (dangerous perms on ANY role) ──
      if (config.filters.strictMode.enabled && action === AuditLogEvent.RoleUpdate) {
        const changes = auditEntry.changes ?? [];
        const permChange = changes.find(c => c.key === "permissions");
        if (permChange) {
          const newPerms = BigInt(permChange.newValue ?? 0);
          if (hasDangerousPerm(newPerms)) {
            const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
            if (!whitelisted) {
              await handleViolation(client, guild, executor, config, {
                reason: `Added dangerous permissions to role (Strict Mode)`,
                filter: "STRICT_MODE_ROLE_PERMS",
              });
              // Revert the permission change
              const role = guild.roles.cache.get(auditEntry.target?.id);
              if (role) {
                const oldPerms = BigInt(permChange.oldValue ?? 0);
                await role.setPermissions(oldPerms).catch(() => {});
              }
            }
          }
        }
      }

      // ── FILTER 5c — Monitor Public Roles (@everyone + main roles) ──
      if (config.filters.monitorPublicRoles.enabled && action === AuditLogEvent.RoleUpdate) {
        const targetId  = auditEntry.target?.id;
        const isEveryone = targetId === guild.id;
        const isMain     = config.mainRoles?.includes(targetId);

        if (isEveryone || isMain) {
          const changes    = auditEntry.changes ?? [];
          const permChange = changes.find(c => c.key === "permissions");
          if (permChange) {
            const newPerms = BigInt(permChange.newValue ?? 0);
            if (hasDangerousPerm(newPerms)) {
              const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
              if (!whitelisted) {
                await handleViolation(client, guild, executor, config, {
                  reason: `Added dangerous permissions to ${isEveryone ? "@everyone" : "main"} role`,
                  filter: "PUBLIC_ROLE_PERMS",
                });
                // Revert
                const role = guild.roles.cache.get(targetId);
                if (role) {
                  const oldPerms = BigInt(permChange.oldValue ?? 0);
                  await role.setPermissions(oldPerms).catch(() => {});
                }
              }
            }
          }
        }
      }

      // ── Quarantine role tampering ─────────────────────────
      // If someone tries to add dangerous perms to the quarantine role
      if (config.quarantineRoleId && action === AuditLogEvent.RoleUpdate) {
        const targetId = auditEntry.target?.id;
        if (targetId === config.quarantineRoleId) {
          const changes    = auditEntry.changes ?? [];
          const permChange = changes.find(c => c.key === "permissions");
          if (permChange) {
            const newPerms = BigInt(permChange.newValue ?? 0);
            if (hasDangerousPerm(newPerms)) {
              await handleViolation(client, guild, executor, config, {
                reason: `Attempted to add dangerous permissions to the Quarantine role`,
                filter: "QUARANTINE_TAMPER",
              });
              // Revert immediately
              const role = guild.roles.cache.get(config.quarantineRoleId);
              if (role) await role.setPermissions(0n).catch(() => {});
            }
          }
        }
      }

      // ── Mass Webhook ──────────────────────────────────────
      if (
        config.filters.massWebhook.enabled &&
        (action === AuditLogEvent.WebhookCreate || action === AuditLogEvent.WebhookDelete)
      ) {
        const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
        if (!whitelisted) {
          const type     = action === AuditLogEvent.WebhookDelete ? "webhook_delete" : "webhook_create";
          const exceeded = trackAction(
            guild.id, executorId, type,
            config.filters.massWebhook.limit,
            config.filters.massWebhook.timeWindow
          );
          if (exceeded) {
            await handleViolation(client, guild, executor, config, {
              reason: `Mass webhook ${type.split("_")[1]} detected`,
              filter: type.toUpperCase(),
            });
          }
        }
      }

      // ── Mass Emoji ────────────────────────────────────────
      if (
        config.filters.massEmoji.enabled &&
        (action === AuditLogEvent.EmojiCreate || action === AuditLogEvent.EmojiDelete)
      ) {
        const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
        if (!whitelisted) {
          const type     = action === AuditLogEvent.EmojiDelete ? "emoji_delete" : "emoji_create";
          const exceeded = trackAction(
            guild.id, executorId, type,
            config.filters.massEmoji.limit,
            config.filters.massEmoji.timeWindow
          );
          if (exceeded) {
            await handleViolation(client, guild, executor, config, {
              reason: `Mass emoji ${type.split("_")[1]} detected`,
              filter: type.toUpperCase(),
            });
          }
        }
      }

      // ── Vanity URL tampering ──────────────────────────────
      if (action === AuditLogEvent.GuildUpdate) {
        const changes    = auditEntry.changes ?? [];
        const vanityChange = changes.find(c => c.key === "vanity_url_code");
        if (vanityChange) {
          const whitelisted = await isWhitelisted(client, guild, executorId, "antinuke");
          if (!whitelisted) {
            await handleViolation(client, guild, executor, config, {
              reason: `Attempted to change the server Vanity URL`,
              filter: "VANITY_URL_CHANGE",
            });
          }
        }
      }

    } catch (err) {
      console.error("[AntiNuke] Monitor error:", err.message);
    }
  },
};

// ============================================================
//  Handle a violation — quarantine executor
//  If panic mode threshold hit → trigger panic mode
// ============================================================
async function handleViolation(client, guild, executor, config, { reason, filter }) {
  // Quarantine the executor
  const result = await quarantineMember(client, guild, executor, reason, filter, true);

  // Count recent violations — if multiple filters triggered in short time → panic mode
  const guildDb  = await client.db.getGuildDb(guild.id);
  const LogModel = require("../../models/AntiNukeLog").fromConnection(guildDb.connection);
  const recentCount = await LogModel.countDocuments({
    guildId:   guild.id,
    action:    "QUARANTINE",
    automated: true,
    createdAt: { $gte: new Date(Date.now() - 30_000) }, // last 30 seconds
  });

  // Trigger panic if 3+ quarantines in 30s
  if (recentCount >= 3 && !config.panicMode?.active) {
    await triggerPanicMode(client, guild, `Multiple antinuke violations detected (${recentCount} in 30s)`, "AUTO");
  }
}
