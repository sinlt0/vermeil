const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
const { formatDuration } = require("../../utils/musicUtils");

module.exports = {
  name:"seek", description:"Seek to a position in the current track.", category:"music",
  aliases:[], usage:"<time e.g. 1:30 or 90>", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("seek").setDescription("Seek to a position.")
    .addStringOption(o=>o.setName("time").setDescription("Time e.g. 1:30 or 90 (seconds).").setRequired(true)).toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player || !player.current) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    if (player.current.info.isStream) return reply(ctx, { embeds:[embeds.error("Cannot seek in a live stream.")] });
    const timeStr = ctx.type==="prefix" ? ctx.args[0] : ctx.interaction.options.getString("time");
    let ms = 0;
    if (timeStr.includes(":")) {
      const [m,s] = timeStr.split(":").map(Number);
      ms = ((m||0)*60 + (s||0)) * 1000;
    } else {
      ms = (parseFloat(timeStr)||0) * 1000;
    }
    const duration = player.current.info.length;
    if (ms < 0 || ms > duration) return reply(ctx, { embeds:[embeds.error(`Invalid position. Track is ${formatDuration(duration)} long.`)] });
    player.seekTo(ms);
    player.trackStartTime = Date.now() - ms;
    const embed = new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${emoji.forward} Seeked to **${formatDuration(ms)}**.`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
