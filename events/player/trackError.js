// ============================================================
//  events/player/trackError.js
//  Notifies channel when a track fails to play
// ============================================================
const { EmbedBuilder } = require("discord.js");
const emoji = require("../../emojis/musicemoji");

module.exports = {
  name:    "trackError",
  emitter: "riffy",
  once:    false,

  async execute(client, player, track, payload) {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${emoji.error} Track Error`)
      .setDescription(`Failed to play **${track.info.title}**.\n\`${payload?.exception?.message ?? "Unknown error"}\``)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});

    // Clear interval
    const interval = client.musicIntervals?.get(player.guildId);
    if (interval) {
      clearInterval(interval);
      client.musicIntervals.delete(player.guildId);
    }
  },
};
