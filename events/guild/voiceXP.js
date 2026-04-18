// ============================================================
//  events/guild/voiceXP.js
//  Awards XP for voice activity at configured intervals
//  Tracks active voice members in memory
// ============================================================
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { addXP, getMultiplier, handleLevelUp } = require("../../utils/levelUtils");

// Map<guildId, Map<userId, intervalId>>
const voiceTimers = new Map();

module.exports = {
  name: "voiceStateUpdate",
  once: false,

  async execute(client, oldState, newState) {
    if (!client.db) return;

    const guild  = newState.guild ?? oldState.guild;
    const userId = newState.id;
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;

    try {
      const guildDb = await client.db.getGuildDb(guild.id);
      if (!guildDb || guildDb.isDown) return;

      const LevelSettingsModel = LevelSettings(guildDb.connection);
      const settings = await LevelSettingsModel.findOne({ guildId: guild.id });
      if (!settings || !settings.enabled || !settings.voiceEnabled) return;

      const joinedVoice = !oldState.channelId && newState.channelId;
      const leftVoice   = oldState.channelId && !newState.channelId;
      const movedVoice  = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

      // Stop timer if left voice
      if (leftVoice || movedVoice) {
        stopVoiceTimer(guild.id, userId);
      }

      if (joinedVoice || movedVoice) {
        const channel = newState.channel;
        if (!channel) return;

        // Check if AFK channel
        if (!settings.voiceAFKEnabled && guild.afkChannelId === channel.id) return;

        // Check blacklisted channels
        if (settings.blacklistedChannels.includes(channel.id)) return;

        // Check blacklisted roles
        if (settings.blacklistedRoles.some(r => member.roles.cache.has(r))) return;

        // Start XP timer
        startVoiceTimer(client, guild, member, settings, guildDb);
      }
    } catch (err) {
      console.error("[voiceXP] Error:", err.message);
    }
  },
};

function startVoiceTimer(client, guild, member, settings, guildDb) {
  if (!voiceTimers.has(guild.id)) voiceTimers.set(guild.id, new Map());
  const guildTimers = voiceTimers.get(guild.id);

  // Clear existing timer
  if (guildTimers.has(member.id)) {
    clearInterval(guildTimers.get(member.id));
  }

  const interval = setInterval(async () => {
    try {
      // Re-fetch member voice state
      const voiceState = guild.voiceStates.cache.get(member.id);
      if (!voiceState?.channelId) {
        stopVoiceTimer(guild.id, member.id);
        return;
      }

      // Check min members requirement
      const channel       = guild.channels.cache.get(voiceState.channelId);
      const memberCount   = channel?.members?.size ?? 0;
      if (memberCount < settings.voiceMinMembers) return;

      // Check AFK
      if (!settings.voiceAFKEnabled && guild.afkChannelId === voiceState.channelId) return;

      // Recalculate multiplier
      const multiplier = getMultiplier(member, settings);
      const xpToAdd    = Math.floor(settings.voiceXP * multiplier);

      const { leveled, oldLevel, newLevel } = await addXP(
        client, guild.id, member, xpToAdd, guildDb.connection
      );

      if (leveled) {
        await handleLevelUp(client, member, guild, oldLevel, newLevel, settings, guildDb.connection);
      }
    } catch {}
  }, settings.voiceInterval * 1000);

  guildTimers.set(member.id, interval);
}

function stopVoiceTimer(guildId, userId) {
  const guildTimers = voiceTimers.get(guildId);
  if (!guildTimers) return;
  const timer = guildTimers.get(userId);
  if (timer) {
    clearInterval(timer);
    guildTimers.delete(userId);
  }
}
