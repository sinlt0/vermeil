// ============================================================
//  events/player/trackStart.js
//  Sends music card when a new track starts
//  Starts progress update loop (every 20s)
//  Cleans up previous message + interval
// ============================================================
const { buildNowPlayingMessage, RateLimitManager } = require("../../utils/musicUtils");

const UPDATE_INTERVAL = 20_000; // 20 seconds

module.exports = {
  name:    "trackStart",
  emitter: "riffy",
  once:    false,

  async execute(client, player, track) {
    const channel = client.channels.cache.get(player.textChannel);
    if (!channel) return;

    // ── Clear previous interval ───────────────────────
    clearMusicInterval(client, player.guildId);

    // ── Delete previous now playing message ───────────
    if (player.nowPlayingMessage) {
      await player.nowPlayingMessage.delete().catch(() => {});
      player.nowPlayingMessage = null;
    }

    // ── Send initial music card ───────────────────────
    try {
      player.previous = track; // Store for autoplay
      const payload = await buildNowPlayingMessage(player, track, 0);
      player.nowPlayingMessage = await channel.send(payload);
      player.trackStartTime    = Date.now();
    } catch (err) {
      console.error("[trackStart] Failed to send music card:", err.message);
      return;
    }

    // ── Setup rate limit manager for this guild ───────
    if (!client.musicRateLimit.has(player.guildId)) {
      client.musicRateLimit.set(player.guildId, new RateLimitManager());
    }
    const rl = client.musicRateLimit.get(player.guildId);

    // ── Start progress update loop ────────────────────
    const intervalId = setInterval(async () => {
      try {
        // Don't update if paused or ended
        if (player.paused || !player.playing) return;
        if (!player.nowPlayingMessage)        return;

        // Rate limit check
        if (rl.isLimited()) return;

        const currentMs = Date.now() - player.trackStartTime;
        const payload   = await buildNowPlayingMessage(player, track, currentMs);

        await player.nowPlayingMessage.edit({
          embeds:     payload.embeds,
          files:      payload.files,
          components: payload.components,
        });

        rl.onSuccess();
      } catch (err) {
        if (err?.status === 429 || err?.code === 429) {
          const retryAfter = (err?.retryAfter ?? 30) * 1000;
          rl.onRateLimit(retryAfter);
        } else if (err?.code === 10008) {
          // Message was deleted — clear interval
          clearMusicInterval(client, player.guildId);
        }
      }
    }, UPDATE_INTERVAL);

    client.musicIntervals.set(player.guildId, intervalId);
  },
};

function clearMusicInterval(client, guildId) {
  const existing = client.musicIntervals.get(guildId);
  if (existing) {
    clearInterval(existing);
    client.musicIntervals.delete(guildId);
  }
}

// Delete any "Added to Queue" messages from play command
async function cleanQueueMessages(player) {
  if (!player.queueAddMessages?.length) return;
  for (const msg of player.queueAddMessages) {
    await msg.delete().catch(() => {});
  }
  player.queueAddMessages = [];
}
