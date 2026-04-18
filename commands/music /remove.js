const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");

module.exports = {
  name:"remove", description:"Remove a track from the queue.", category:"music",
  aliases:["rm"], usage:"<position>", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("remove").setDescription("Remove a track from the queue.")
    .addIntegerOption(o=>o.setName("position").setDescription("Position in queue.").setRequired(true).setMinValue(1)).toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    const pos = ctx.type==="prefix" ? parseInt(ctx.args[0]) : ctx.interaction.options.getInteger("position");
    if (!pos||pos<1||pos>player.queue.length) return reply(ctx, { embeds:[embeds.error(`Invalid position. Queue has ${player.queue.length} tracks.`)] });
    const removed = player.queue.splice(pos-1,1)[0];
    const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(`${emoji.stop} Removed **${removed.info.title}** from position \`${pos}\`.`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
