// ============================================================
//  commands/music/stop.js
//  Stop music — if 24/7 enabled: clear queue + stay in VC
//  If 24/7 disabled: clear queue + disconnect
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply }                           = require("../../utils/commandRunner");
const embeds                              = require("../../utils/embeds");
const emoji                               = require("../../emojis/musicemoji");
const { fromConnection: TwentyFourSeven } = require("../../models/TwentyFourSeven");

module.exports = {
  name:             "stop",
  description:      "Stop music and clear the queue.",
  category:         "music",
  aliases:          ["dc", "disconnect"],
  usage:            "",
  cooldown:         2,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stop music and clear the queue.")
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!member.voice.channel) {
      return reply(ctx, { embeds: [embeds.error("You must be in a voice channel.")] });
    }

    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds: [embeds.error("Nothing is playing.")] });

    // ── Check 24/7 mode ───────────────────────────────
    let is247 = false;
    try {
      const guildDb = await client.db.getGuildDb(guild.id);
      if (guildDb && !guildDb.isDown) {
        const TFModel = TwentyFourSeven(guildDb.connection);
        const tf      = await TFModel.findOne({ guildId: guild.id });
        is247         = tf?.enabled ?? false;
      }
    } catch {}

    // Clear queue and stop current track
    player.queue.clear();
    player.stop();

    if (is247) {
      // 24/7 mode — stay in VC, just clear everything
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription(`${emoji.stop} Queue cleared. Staying in voice channel — **24/7 mode is active**.\nUse \`/247\` to disable 24/7 mode.`)
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    // Normal mode — destroy player and leave
    player.destroy();
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setDescription(`${emoji.stop} Stopped playback and disconnected.`)
      .setTimestamp();
    return reply(ctx, { embeds: [embed] });
  },
};
