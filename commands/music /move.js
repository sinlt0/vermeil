const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");

module.exports = {
  name:"move", description:"Move a track to a different position in the queue.", category:"music",
  aliases:[], usage:"<from> <to>", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("move").setDescription("Move a track in the queue.")
    .addIntegerOption(o=>o.setName("from").setDescription("Current position.").setRequired(true).setMinValue(1))
    .addIntegerOption(o=>o.setName("to").setDescription("New position.").setRequired(true).setMinValue(1)).toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    const from = ctx.type==="prefix" ? parseInt(ctx.args[0]) : ctx.interaction.options.getInteger("from");
    const to   = ctx.type==="prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("to");
    const q    = player.queue;
    if (!from||from<1||from>q.length) return reply(ctx, { embeds:[embeds.error(`Invalid position. Queue has ${q.length} tracks.`)] });
    if (!to  ||to  <1||to  >q.length) return reply(ctx, { embeds:[embeds.error(`Invalid target. Queue has ${q.length} tracks.`)] });
    const track = q.splice(from-1,1)[0];
    q.splice(to-1,0,track);
    const embed = new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${emoji.queue} Moved **${track.info.title}** from position \`${from}\` to \`${to}\`.`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
