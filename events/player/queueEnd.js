// ============================================================
//  events/player/queueEnd.js
//  Queue finished — handle 24/7 mode or disconnect
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");
const emoji = require("../../emojis/musicemoji");

module.exports = {
  name:    "queueEnd",
  emitter: "riffy",
  once:    false,

  async execute(client, player) {
    const channel = client.channels.cache.get(player.textChannel);

    // ── Autoplay Logic ──────────────────────────────────
    if (player.autoplay) {
      try {
        const lastTrack = player.previous;
        if (lastTrack) {
          // You can use different search platforms. ytmsearch is often better for related.
          const search = `https://www.youtube.com/watch?v=${lastTrack.info.identifier}&list=RD${lastTrack.info.identifier}`;
          const res = await client.riffy.resolve({ query: search, requester: client.user });

          if (res.loadType !== "error" && res.loadType !== "empty" && res.tracks.length > 1) {
            // Find a track that isn't the same as the last one if possible
            const nextTrack = res.tracks[Math.floor(Math.random() * Math.min(res.tracks.length, 5))];
            player.queue.add(nextTrack);
            player.play();
            return;
          }
        }
      } catch (err) {
        console.error("[Autoplay] Failed to fetch related track:", err.message);
      }
    }

    // Clear interval
    const interval = client.musicIntervals?.get(player.guildId);
    if (interval) {
      clearInterval(interval);
      client.musicIntervals.delete(player.guildId);
    }

    // Delete now playing message
    if (player.nowPlayingMessage) {
      await player.nowPlayingMessage.delete().catch(() => {});
      player.nowPlayingMessage = null;
    }

    // Check 24/7 mode
    try {
      if (client.db) {
        const guildDb = await client.db.getGuildDb(player.guildId);
        if (guildDb && !guildDb.isDown) {
          const TFModel = TwentyFourSeven(guildDb.connection);
          const tf      = await TFModel.findOne({ guildId: player.guildId });

          if (tf?.enabled) {
            // 24/7 mode — stay in vc, just send queue ended message
            if (channel) {
              const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setDescription(`${emoji.tf} Queue finished. 24/7 mode is active — staying in voice channel.`)
                .setTimestamp();
              await channel.send({ embeds: [embed] }).catch(() => {});
            }
            return;
          }
        }
      }
    } catch {}

    // No 24/7 — send queue ended and disconnect
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(`${emoji.notes} Queue finished. Leaving voice channel.`)
        .setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }

    player.stop();
    player.destroy();
  },
};
