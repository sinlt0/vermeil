// ============================================================
//  events/player/playerDestroy.js
//  Fires when a player is destroyed (stop, kick, etc.)
//  Cleans up:
//  - Progress update interval
//  - Now playing message
//  - Rate limit manager
//  - Queue add messages
// ============================================================
const chalk = require("chalk");

module.exports = {
  name:    "playerDestroy",
  emitter: "riffy",
  once:    false,

  async execute(client, player) {
    // ── Clear progress interval ───────────────────────
    const interval = client.musicIntervals?.get(player.guildId);
    if (interval) {
      clearInterval(interval);
      client.musicIntervals.delete(player.guildId);
    }

    // ── Delete now playing message ────────────────────
    if (player.nowPlayingMessage) {
      await player.nowPlayingMessage.delete().catch(() => {});
      player.nowPlayingMessage = null;
    }

    // ── Delete any leftover "Added to Queue" messages ─
    if (player.queueAddMessages?.length) {
      for (const msg of player.queueAddMessages) {
        await msg.delete().catch(() => {});
      }
      player.queueAddMessages = [];
    }

    // ── Clear rate limit manager ──────────────────────
    client.musicRateLimit?.delete(player.guildId);

    console.log(chalk.gray(`  [Music] 🗑️  Player destroyed for guild: ${player.guildId}`));
  },
};
