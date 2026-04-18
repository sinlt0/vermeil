// ============================================================
//  events/guild/guildMemberAdd.js
//  Fires when a member joins
//  Priority:
//  1. If verification enabled → give unverified role (humans only)
//  2. If verification disabled → give autoroles normally
//  3. Send welcome message
// ============================================================
const { fromConnection: GreetSettings }       = require("../../models/GreetSettings");
const { fromConnection: AutoRole }            = require("../../models/AutoRole");
const { fromConnection: VerificationConfig }  = require("../../models/VerificationConfig");
const { sendGreetMessage }                    = require("../../utils/greetUtils");

module.exports = {
  name: "guildMemberAdd",
  once: false,

  async execute(client, member) {
    if (!client.db) return;

    try {
      const guildDb = await client.db.getGuildDb(member.guild.id);
      if (!guildDb || guildDb.isDown) return;

      // ── Bots: skip verification + autorole ───────────
      if (member.user.bot) {
        const AutoRoleModel = AutoRole(guildDb.connection);
        const autoConfig    = await AutoRoleModel.findOne({ guildId: member.guild.id });
        if (autoConfig?.botRoles?.length) {
          for (const roleId of autoConfig.botRoles) {
            const role = member.guild.roles.cache.get(roleId);
            if (!role) continue;
            if (role.position >= member.guild.members.me.roles.highest.position) continue;
            await member.roles.add(role).catch(() => {});
          }
        }
        return; // bots skip welcome + verification
      }

      // ── Check if verification is enabled ─────────────
      const VerifyModel = VerificationConfig(guildDb.connection);
      const verifyConfig = await VerifyModel.findOne({ guildId: member.guild.id });

      if (verifyConfig?.enabled && verifyConfig?.unverifiedRoleId) {
        // Give unverified role — DO NOT give human autoroles yet
        const unverifiedRole = member.guild.roles.cache.get(verifyConfig.unverifiedRoleId);
        if (unverifiedRole) {
          if (unverifiedRole.position < member.guild.members.me.roles.highest.position) {
            await member.roles.add(unverifiedRole).catch(() => {});
          }
        }
      } else {
        // Verification disabled — give human autoroles normally
        const AutoRoleModel = AutoRole(guildDb.connection);
        const autoConfig    = await AutoRoleModel.findOne({ guildId: member.guild.id });
        if (autoConfig?.humanRoles?.length) {
          for (const roleId of autoConfig.humanRoles) {
            const role = member.guild.roles.cache.get(roleId);
            if (!role) continue;
            if (role.position >= member.guild.members.me.roles.highest.position) continue;
            await member.roles.add(role).catch(() => {});
          }
        }
      }

      // ── Welcome message ───────────────────────────────
      const GreetSettingsModel = GreetSettings(guildDb.connection);
      let settings = await GreetSettingsModel.findOne({ guildId: member.guild.id });
      
      if (settings?.welcome?.enabled) {
        await sendGreetMessage(client, member, "welcome", settings);
      }

      // ── DM Welcome Fallback ───────────────────────────
      if (settings?.welcome?.dmEnabled && settings?.welcome?.dmMessage) {
        try {
          const { replaceVariables } = require("../../utils/greetUtils");
          const dmMsg = await replaceVariables(settings.welcome.dmMessage, member, "welcome");
          await member.send({ content: dmMsg }).catch(() => null);
        } catch {}
      }
    } catch (err) {
      console.error("[guildMemberAdd] Critical Error:", err.message);
    }
  },
};
