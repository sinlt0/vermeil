const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
module.exports = {
  name:"resume", description:"Resume playback.", category:"music",
  aliases:[], usage:"", cooldown:2,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("resume").setDescription("Resume playback.").toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    if (!player.paused) return reply(ctx, { embeds:[embeds.error("Not paused.")] });
    player.pause(false);
    const embed = new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${emoji.play} Resumed playback.`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
