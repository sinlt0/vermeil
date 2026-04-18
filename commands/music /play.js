// ============================================================
//  commands/music/play.js
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const emoji              = require("../../emojis/musicemoji");
const { formatDuration } = require("../../utils/musicUtils");

module.exports = {
  name: "play", description: "Play a song or add to queue.", category: "music",
  aliases: ["p"], usage: "<query or url>", cooldown: 3,
  ownerOnly: false, devOnly: false, requiresDatabase: false, slash: true,

  slashData: new SlashCommandBuilder()
    .setName("play").setDescription("Play a song or add to queue.")
    .addStringOption(o => o.setName("query").setDescription("Song name or URL.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const member  = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;

    if (!member.voice.channel) {
      return reply(ctx, { embeds: [embeds.error("You must be in a voice channel.")] });
    }

    if (!client.riffy) {
      return reply(ctx, { embeds: [embeds.error("Music system is not ready yet.")] });
    }

    const query = ctx.type === "prefix"
      ? ctx.args.join(" ")
      : ctx.interaction.options.getString("query");
    if (!query) return reply(ctx, { embeds: [embeds.error("Please provide a song name or URL.")] });

    if (ctx.type === "slash") await ctx.interaction.deferReply();

    // ── Create or get existing player ─────────────────
    const player = client.riffy.createConnection({
      guildId:      guild.id,
      voiceChannel: member.voice.channel.id,
      textChannel:  channel.id,
      deaf:         true,
    });

    // ── Resolve tracks ────────────────────────────────
    let resolve;
    try {
      resolve = await client.riffy.resolve({ query, requester: member.user });
    } catch (err) {
      const errEmbed = embeds.error(`Failed to resolve track: ${err.message}`);
      return ctx.type === "prefix"
        ? reply(ctx, { embeds: [errEmbed] })
        : ctx.interaction.editReply({ embeds: [errEmbed] });
    }

    if (!resolve || !resolve.tracks?.length) {
      const errEmbed = embeds.error(`No results found for **${query}**`);
      return ctx.type === "prefix"
        ? reply(ctx, { embeds: [errEmbed] })
        : ctx.interaction.editReply({ embeds: [errEmbed] });
    }

    const { loadType, tracks, playlistInfo } = resolve;

    // ── Playlist ──────────────────────────────────────
    if (loadType === "playlist") {
      for (const t of tracks) {
        t.info.requester = member.user;
        player.queue.add(t);
      }

      const totalDuration = tracks.reduce((a, t) => a + (t.info.length || 0), 0);
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${emoji.playlist} Playlist Added`)
        .setDescription(`**${playlistInfo.name}**`)
        .addFields(
          { name: `${emoji.music} Tracks`,   value: `${tracks.length}`,              inline: true },
          { name: `${emoji.clock} Duration`, value: formatDuration(totalDuration),   inline: true },
        )
        .setThumbnail(tracks[0]?.info?.artworkUrl ?? null)
        .setTimestamp();

      if (ctx.type === "prefix") reply(ctx, { embeds: [embed] });
      else await ctx.interaction.editReply({ embeds: [embed] });

    // ── Single track ──────────────────────────────────
    } else {
      const track          = tracks[0];
      track.info.requester = member.user;

      // Check queue state BEFORE adding the track
      const wasEmpty = player.queue.length === 0 && !player.playing;

      player.queue.add(track);

      if (!wasEmpty) {
        // Already playing — show "Added to Queue"
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`${emoji.music} Added to Queue`)
          .setDescription(`**[${track.info.title}](${track.info.uri})**`)
          .addFields(
            { name: `${emoji.mic} Artist`,     value: track.info.author,                 inline: true },
            { name: `${emoji.clock} Duration`, value: formatDuration(track.info.length), inline: true },
            { name: `${emoji.queue} Position`, value: `#${player.queue.length}`,          inline: true },
          )
          .setThumbnail(track.info.artworkUrl ?? null)
          .setTimestamp();

        const msg = ctx.type === "prefix"
          ? await ctx.message.channel.send({ embeds: [embed] })
          : await ctx.interaction.editReply({ embeds: [embed] });

        // Store to delete when track starts playing
        if (!player.queueAddMessages) player.queueAddMessages = [];
        player.queueAddMessages.push(msg);
      } else {
        // Queue was empty — loading message (music card will replace it)
        if (ctx.type === "slash") {
          await ctx.interaction.editReply({ content: `${emoji.loading} Loading **${track.info.title}**...` });
        }
      }
    }

    // ── Start playback only if not already playing ────
    // Double check queue has tracks before calling play()
    if (!player.playing && !player.paused && player.queue.length > 0) {
      player.play();
    }
  },
};
