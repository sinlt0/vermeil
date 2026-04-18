// ============================================================
//  events/guild/messageXP.js
//  Awards XP on message with cooldown + multiplier support
// ============================================================
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { addXP, getMultiplier, handleLevelUp, getLevelFromXP } = require("../../utils/levelUtils");

// In-memory cooldown map — guildId:userId → timestamp
const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;

    try {
      const guildDb = await client.db.getGuildDb(message.guild.id);
      if (!guildDb || guildDb.isDown) return;

      const LevelSettingsModel = LevelSettings(guildDb.connection);
      const settings = await LevelSettingsModel.findOne({ guildId: message.guild.id });
      if (!settings || !settings.enabled) return;

      // Check blacklisted channel
      if (settings.blacklistedChannels.includes(message.channel.id)) return;

      // Check blacklisted roles
      const member = message.member;
      if (settings.blacklistedRoles.some(r => member.roles.cache.has(r))) return;

      // Check cooldown
      const key     = `${message.guild.id}:${message.author.id}`;
      const lastMsg = cooldowns.get(key) ?? 0;
      const now     = Date.now();
      if (now - lastMsg < settings.cooldown * 1000) return;
      cooldowns.set(key, now);

      // Calculate XP with multiplier
      const baseXP     = Math.floor(Math.random() * (settings.maxXP - settings.minXP + 1)) + settings.minXP;
      const multiplier = getMultiplier(member, settings);
      const xpToAdd    = Math.floor(baseXP * multiplier);

      const { leveled, oldLevel, newLevel, data } = await addXP(
        client, message.guild.id, member, xpToAdd, guildDb.connection
      );

      if (leveled) {
        await handleLevelUp(client, member, message.guild, oldLevel, newLevel, settings, guildDb.connection);

        // Send in same channel if no level up channel set and DM is off
        if (!settings.levelUpChannel && !settings.levelUpDM) {
          const { fromConnection: UserLevel } = require("../../models/UserLevel");
          const UserLevelModel = UserLevel(guildDb.connection);
          const userData = await UserLevelModel.findOne({ guildId: message.guild.id, userId: member.id });
          const rank = await UserLevelModel.countDocuments({
            guildId: message.guild.id,
            xp: { $gt: userData?.xp ?? 0 },
          }) + 1;

          const { replaceLevelVariables } = require("../../utils/levelUtils");
          const customMsg  = settings.customMessages?.find(m => m.level === newLevel);
          const msgTemplate = customMsg?.message ?? settings.levelUpMessage;
          const latestReward = settings.roleRewards
            .filter(r => r.level <= newLevel)
            .sort((a, b) => b.level - a.level)[0];
          const roleRewardName = latestReward
            ? message.guild.roles.cache.get(latestReward.roleId)?.name ?? "Unknown Role"
            : "None";

          const msg = await replaceLevelVariables(msgTemplate, member, newLevel, oldLevel, roleRewardName, guildDb.connection, message.guild);
          await message.channel.send({ content: msg }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("[messageXP] Error:", err.message);
    }
  },
};
