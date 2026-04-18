// ============================================================
//  events/player/playerCreate.js
//  Fires when a new player is created for a guild
//  Sets default volume, initializes player state
// ============================================================
const chalk = require("chalk");

module.exports = {
  name:    "playerCreate",
  emitter: "riffy",
  once:    false,

  async execute(client, player) {
    // Initialize custom state on player
    player.nowPlayingMessage = null;  // stores the music card message
    player.trackStartTime    = null;  // Date.now() when track started
    player.queueAddMessages  = [];    // "Added to Queue" messages to delete
    player.autoplay          = false; // autoplay toggle

    // Set default volume
    player.setVolume(80);

    console.log(chalk.cyan(`  [Music] 🎵 Player created for guild: ${player.guildId}`));
  },
};
