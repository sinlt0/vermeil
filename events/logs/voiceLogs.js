// ============================================================
//  events/logs/voiceLogs.js
//  Voice join, leave, move, mute, deafen, server mute/deafen
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { sendLog } = require("../../utils/logUtils");

module.exports = {
  name: "voiceStateUpdate",
  once: false,
  async execute(client, oldState, newState) {
    const guild  = newState.guild;
    const member = newState.member;
    if (!member || member.user.bot) return;

    const user = `${member.user.tag} (<@${member.id}>)`;

    // ── Joined ────────────────────────────────────────────
    if (!oldState.channelId && newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🔊 Joined Voice Channel")
        .addFields(
          { name: "User",    value: user,                        inline: true },
          { name: "Channel", value: `<#${newState.channelId}>`, inline: true },
        )
        .setFooter({ text: `Voice Join • ${guild.name}` })
        .setTimestamp();
      return sendLog(client, guild, "voice", embed);
    }

    // ── Left ──────────────────────────────────────────────
    if (oldState.channelId && !newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🔇 Left Voice Channel")
        .addFields(
          { name: "User",    value: user,                        inline: true },
          { name: "Channel", value: `<#${oldState.channelId}>`, inline: true },
        )
        .setFooter({ text: `Voice Leave • ${guild.name}` })
        .setTimestamp();
      return sendLog(client, guild, "voice", embed);
    }

    // ── Moved ─────────────────────────────────────────────
    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🔀 Moved Voice Channel")
        .addFields(
          { name: "User",   value: user,                         inline: true },
          { name: "From",   value: `<#${oldState.channelId}>`,  inline: true },
          { name: "To",     value: `<#${newState.channelId}>`,  inline: true },
        )
        .setFooter({ text: `Voice Move • ${guild.name}` })
        .setTimestamp();
      return sendLog(client, guild, "voice", embed);
    }

    // ── Server muted/unmuted ──────────────────────────────
    if (oldState.serverMute !== newState.serverMute) {
      const embed = new EmbedBuilder()
        .setColor(newState.serverMute ? 0xFEE75C : 0x57F287)
        .setTitle(newState.serverMute ? "🔇 Server Muted" : "🔊 Server Unmuted")
        .addFields(
          { name: "User",    value: user,                                                               inline: true },
          { name: "Channel", value: newState.channelId ? `<#${newState.channelId}>` : "Unknown",       inline: true },
        )
        .setFooter({ text: `Voice Mute • ${guild.name}` })
        .setTimestamp();
      return sendLog(client, guild, "voice", embed);
    }

    // ── Server deafened/undeafened ────────────────────────
    if (oldState.serverDeaf !== newState.serverDeaf) {
      const embed = new EmbedBuilder()
        .setColor(newState.serverDeaf ? 0xFEE75C : 0x57F287)
        .setTitle(newState.serverDeaf ? "🔕 Server Deafened" : "🔔 Server Undeafened")
        .addFields(
          { name: "User",    value: user,                                                               inline: true },
          { name: "Channel", value: newState.channelId ? `<#${newState.channelId}>` : "Unknown",       inline: true },
        )
        .setFooter({ text: `Voice Deafen • ${guild.name}` })
        .setTimestamp();
      return sendLog(client, guild, "voice", embed);
    }
  },
};
