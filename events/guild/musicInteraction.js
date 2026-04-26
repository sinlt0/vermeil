// ============================================================
//  events/guild/musicInteraction.js
//  Handles music card button interactions
// ============================================================
const { buildNowPlayingMessage, buildFiltersMenu, applyFilter } = require("../../utils/musicUtils");
const embeds = require("../../utils/embeds");
const emoji  = require("../../emojis/musicemoji");
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.guild) return;

    const player = client.riffy?.players.get(interaction.guild.id);

    // ── Filter select menu ─────────────────────────────
    if (interaction.isStringSelectMenu() && interaction.customId === "music_filter_select") {
      if (!player) return interaction.reply({ content:"Nothing is playing.", ephemeral:true });
      const name = interaction.values[0];
      await applyFilter(player, name);
      const label = name==="none" ? "Filters cleared" : `**${name.charAt(0).toUpperCase()+name.slice(1)}** applied`;
      return interaction.reply({ embeds:[embeds.success(`${emoji.filter} ${label}.`)], ephemeral:true });
    }

    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("music_")) return;
    if (!player) return interaction.reply({ content:"Nothing is playing.", ephemeral:true });

    const member = interaction.member;
    if (!member.voice.channel) return interaction.reply({ content:"You must be in a voice channel.", ephemeral:true });

    await interaction.deferUpdate().catch(()=>{});

    switch (interaction.customId) {
      case "music_pause":
        player.paused ? player.pause(false) : player.pause(true);
        break;
      case "music_skip":    player.stop(); break;
      case "music_stop": {
        try {
          if (client.db) {
            const guildDb = await client.db.getGuildDb(interaction.guild.id);
            if (guildDb && !guildDb.isDown) {
              const TFModel = TwentyFourSeven(guildDb.connection);
              const tf = await TFModel.findOne({ guildId: interaction.guild.id });
              if (tf?.enabled) {
                player.queue.clear();
                player.stop();
                return; // Stop music but stay in VC
              }
            }
          }
        } catch {}
        player.stop(); 
        player.destroy(); 
        break;
      }
      case "music_shuffle": if (player.queue.length>=2) player.queue.shuffle(); break;
      case "music_voldown": player.setVolume(Math.max(player.volume-10, 1)); break;
      case "music_volup":   player.setVolume(Math.min(player.volume+10, 200)); break;
      case "music_loop": {
        const c = { none:"track", track:"queue", queue:"none" };
        player.setLoop((c[player.loop??"none"])==="none" ? null : c[player.loop??"none"]);
        break;
      }
      case "music_autoplay":
        player.autoplay = !player.autoplay;
        if (typeof player.setAutoplay === "function") player.setAutoplay(player.autoplay);
        break;
      case "music_filters":
        await interaction.followUp({ embeds:[embeds.info("Select a filter:", `${emoji.filter} Filters`)], components:[buildFiltersMenu()], ephemeral:true });
        return;
      case "music_prev":
        if (player.current) player.seekTo(0);
        break;
    }

    // Refresh card
    if (player.nowPlayingMessage && player.current && interaction.customId !== "music_stop") {
      try {
        const ms = player.trackStartTime ? Date.now()-player.trackStartTime : 0;
        const p  = await buildNowPlayingMessage(player, player.current, ms);
        await player.nowPlayingMessage.edit(p);
      } catch {}
    }
  },
};
