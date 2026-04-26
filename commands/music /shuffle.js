const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
module.exports = {
  name:"shuffle", description:"Shuffle the queue.", category:"music",
  aliases:[], usage:"", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("shuffle").setDescription("Shuffle the queue.").toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    if (player.queue.length < 2) return reply(ctx, { embeds:[embeds.error("Need at least 2 tracks in queue to shuffle.")] });
    player.queue.shuffle();
    const embed = new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${emoji.shuffle} Queue shuffled! (${player.queue.length} tracks)`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
