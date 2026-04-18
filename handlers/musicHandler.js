// ============================================================
//  handlers/musicHandler.js
//  Initializes Riffy and attaches to client
// ============================================================
const { Riffy }   = require("riffy");
const { GatewayDispatchEvents } = require("discord.js");
const config      = require("../config");
const chalk       = require("chalk");

module.exports = async (client) => {
  const lava = config.lavalink;

  client.riffy = new Riffy(client, [
    {
      host:     lava.host,
      port:     lava.port,
      password: lava.password,
      secure:   lava.secure ?? false,
      name:     lava.name ?? "Main Node",
    },
  ], {
    send: (payload) => {
      const guild = client.guilds.cache.get(payload.d.guild_id);
      if (guild) guild.shard.send(payload);
    },
    defaultSearchPlatform: "ytmsearch",
    restVersion:           lava.restVersion ?? "v4",
  });

  // Forward voice state/server updates to Riffy
  client.on("raw", (data) => {
    if ([
      GatewayDispatchEvents.VoiceStateUpdate,
      GatewayDispatchEvents.VoiceServerUpdate,
    ].includes(data.t)) {
      client.riffy.updateVoiceState(data);
    }
  });

  // Map to store per-guild progress update intervals + rate limit managers
  client.musicIntervals  = new Map(); // guildId → intervalId
  client.musicRateLimit  = new Map(); // guildId → RateLimitManager

  console.log(chalk.cyan("  [Music] Riffy initialized."));
};
