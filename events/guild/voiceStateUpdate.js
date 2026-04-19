// ============================================================
//  events/guild/voiceStateUpdate.js
//  Handles voice state changes for Music and VoiceMaster
// ============================================================
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");
const { handleVoiceJoin, handleVoiceLeave } = require("../../utils/voicemaster/voiceUtils");

module.exports = {
  name: "voiceStateUpdate",
  once: false,

  async execute(client, oldState, newState) {
    // ── 1. Update Riffy internal state (if applicable) ──
    if (client.riffy) {
      await client.riffy.updateVoiceState(oldState, newState);
    }

    // ── 2. Avoid processing if it's just a mute/deaf change ──
    if (oldState.channelId === newState.channelId) return;

    // ── 3. Music System Logic ──────────────────────────────
    const guild = oldState.guild ?? newState.guild;
    const player = client.riffy?.players.get(guild.id);

    if (player) {
      // Bot was disconnected or moved
      if (oldState.id === client.user.id) {
        if (!newState.channelId) {
          player.destroy();
        } else if (oldState.channelId !== newState.channelId) {
          player.voiceChannel = newState.channelId;
        }
      } else {
        // Check if VC is now empty
        const voiceChannel = guild.channels.cache.get(player.voiceChannel);
        if (voiceChannel) {
          const humans = voiceChannel.members.filter(m => !m.user.bot);
          if (humans.size === 0) {
            try {
              if (client.db) {
                const guildDb = await client.db.getGuildDb(guild.id);
                if (guildDb && !guildDb.isDown) {
                  const TFModel = TwentyFourSeven(guildDb.connection);
                  const tf = await TFModel.findOne({ guildId: guild.id });
                  if (!tf?.enabled) {
                    // No 24/7 — pause and wait 30s
                    if (!player.paused) player.pause(true);
                    setTimeout(async () => {
                      const stillEmpty = voiceChannel.members.filter(m => !m.user.bot).size === 0;
                      if (stillEmpty) {
                        player.stop();
                        player.destroy();
                      } else if (player.paused) {
                        player.pause(false);
                      }
                    }, 30000);
                  }
                }
              }
            } catch (err) {
              console.error("[Music] VoiceState Error:", err.message);
            }
          }
        }
      }
    }

    // ── 4. VoiceMaster System Logic ───────────────────────
    // Handle Join
    if (newState.channelId) {
      await handleVoiceJoin(client, oldState, newState);
    }
    // Handle Leave
    if (oldState.channelId) {
      await handleVoiceLeave(client, oldState, newState);
    }
  },
};
