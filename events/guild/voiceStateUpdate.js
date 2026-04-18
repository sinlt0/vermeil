// ============================================================
//  events/guild/voiceStateUpdate.js
//  Handles voice state changes for music:
//  - If everyone leaves VC → check 24/7 → leave or stay
//  - If bot is moved to different VC → update player
//  - If bot is disconnected → destroy player
// ============================================================
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");

module.exports = {
  name: "voiceStateUpdate",
  once: false,

  async execute(client, oldState, newState) {
    if (!client.riffy) return;

    const guild  = oldState.guild ?? newState.guild;
    const player = client.riffy.players.get(guild.id);
    if (!player) return;

    // ── Bot was disconnected or moved ─────────────────
    if (oldState.id === client.user.id) {
      // Bot left VC entirely
      if (!newState.channelId) {
        player.destroy();
        return;
      }
      // Bot was moved to a different VC — update player
      if (oldState.channelId !== newState.channelId) {
        player.voiceChannel = newState.channelId;
      }
      return;
    }

    // ── Check if VC is now empty (only bot left) ──────
    const voiceChannel = guild.channels.cache.get(player.voiceChannel);
    if (!voiceChannel) return;

    const humans = voiceChannel.members.filter(m => !m.user.bot);
    if (humans.size > 0) return; // still people in VC

    // VC is empty — check 24/7 mode
    try {
      if (client.db) {
        const guildDb = await client.db.getGuildDb(guild.id);
        if (guildDb && !guildDb.isDown) {
          const TFModel = TwentyFourSeven(guildDb.connection);
          const tf      = await TFModel.findOne({ guildId: guild.id });
          if (tf?.enabled) return; // 24/7 — stay in VC
        }
      }
    } catch {}

    // No 24/7 — pause and wait 30s then leave if still empty
    if (!player.paused) player.pause(true);

    setTimeout(async () => {
      // Re-check if still empty
      const stillEmpty = voiceChannel.members.filter(m => !m.user.bot).size === 0;
      if (!stillEmpty) {
        // Someone came back — resume
        if (player.paused) player.pause(false);
        return;
      }
      // Still empty — destroy
      player.stop();
      player.destroy();
    }, 30_000);
  },
};
