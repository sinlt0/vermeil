// ============================================================
//  events/guild/voiceStateUpdate.js
//  Handles voice state changes for:
//  1. Riffy (music internal state)
//  2. Music system (empty VC pause/leave, 24/7 check)
//  3. VoiceMaster system (join/leave hub channels)
//  4. Voice logging (join, leave, move, server mute/deafen)
// ============================================================
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");
const { handleVoiceJoin, handleVoiceLeave } = require("../../utils/voicemaster/voiceUtils");
const { sendLog } = require("../../utils/logUtils");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "voiceStateUpdate",
  once: false,

  async execute(client, oldState, newState) {
    const guild  = oldState.guild ?? newState.guild;
    const member = newState.member ?? oldState.member;

    // ── 1. Riffy internal state update ────────────────────
    // Must run BEFORE the channel check so Riffy always gets updated
    if (client.riffy) {
      await client.riffy.updateVoiceState(oldState, newState);
    }

    // ── 2. Voice logging ──────────────────────────────────
    // Runs for ALL voice state changes including mute/deafen
    // Must be BEFORE the channelId equality check
    if (member && !member.user.bot) {
      await handleVoiceLog(client, guild, member, oldState, newState);
    }

    // ── 3. Stop processing if no channel change ────────────
    // Music + VoiceMaster only care about channel moves
    if (oldState.channelId === newState.channelId) return;

    // ── 4. Music system ───────────────────────────────────
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
                  const tf      = await TFModel.findOne({ guildId: guild.id });
                  if (!tf?.enabled) {
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

    // ── 5. VoiceMaster system ─────────────────────────────
    if (newState.channelId) {
      await handleVoiceJoin(client, oldState, newState);
    }
    if (oldState.channelId) {
      await handleVoiceLeave(client, oldState, newState);
    }
  },
};

// ============================================================
//  Voice log handler
// ============================================================
async function handleVoiceLog(client, guild, member, oldState, newState) {
  try {
    const user = `${member.user.tag} (<@${member.id}>)`;

    // Joined
    if (!oldState.channelId && newState.channelId) {
      return sendLog(client, guild, "voice", new EmbedBuilder()
        .setColor(0x57F287).setTitle("🔊 Joined Voice Channel")
        .addFields(
          { name: "User",    value: user,                        inline: true },
          { name: "Channel", value: `<#${newState.channelId}>`, inline: true },
        )
        .setFooter({ text: `Voice Join • ${guild.name}` }).setTimestamp());
    }

    // Left
    if (oldState.channelId && !newState.channelId) {
      return sendLog(client, guild, "voice", new EmbedBuilder()
        .setColor(0xED4245).setTitle("🔇 Left Voice Channel")
        .addFields(
          { name: "User",    value: user,                        inline: true },
          { name: "Channel", value: `<#${oldState.channelId}>`, inline: true },
        )
        .setFooter({ text: `Voice Leave • ${guild.name}` }).setTimestamp());
    }

    // Moved
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      return sendLog(client, guild, "voice", new EmbedBuilder()
        .setColor(0x5865F2).setTitle("🔀 Moved Voice Channel")
        .addFields(
          { name: "User", value: user,                        inline: true },
          { name: "From", value: `<#${oldState.channelId}>`, inline: true },
          { name: "To",   value: `<#${newState.channelId}>`, inline: true },
        )
        .setFooter({ text: `Voice Move • ${guild.name}` }).setTimestamp());
    }

    // Server muted/unmuted
    if (oldState.serverMute !== newState.serverMute) {
      return sendLog(client, guild, "voice", new EmbedBuilder()
        .setColor(newState.serverMute ? 0xFEE75C : 0x57F287)
        .setTitle(newState.serverMute ? "🔇 Server Muted" : "🔊 Server Unmuted")
        .addFields(
          { name: "User",    value: user,                                                           inline: true },
          { name: "Channel", value: newState.channelId ? `<#${newState.channelId}>` : "Unknown",  inline: true },
        )
        .setFooter({ text: `Server Mute • ${guild.name}` }).setTimestamp());
    }

    // Server deafened/undeafened
    if (oldState.serverDeaf !== newState.serverDeaf) {
      return sendLog(client, guild, "voice", new EmbedBuilder()
        .setColor(newState.serverDeaf ? 0xFEE75C : 0x57F287)
        .setTitle(newState.serverDeaf ? "🔕 Server Deafened" : "🔔 Server Undeafened")
        .addFields(
          { name: "User",    value: user,                                                           inline: true },
          { name: "Channel", value: newState.channelId ? `<#${newState.channelId}>` : "Unknown",  inline: true },
        )
        .setFooter({ text: `Server Deafen • ${guild.name}` }).setTimestamp());
    }
  } catch (err) {
    console.error("[VoiceLogs] Error:", err.message);
  }
}
