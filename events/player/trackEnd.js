// ============================================================
//  events/player/trackEnd.js
//  Cleans up progress interval when track ends
// ============================================================
module.exports = {
  name:    "trackEnd",
  emitter: "riffy",
  once:    false,

  async execute(client, player, track) {
    // Clear progress interval
    const interval = client.musicIntervals?.get(player.guildId);
    if (interval) {
      clearInterval(interval);
      client.musicIntervals.delete(player.guildId);
    }
  },
};
