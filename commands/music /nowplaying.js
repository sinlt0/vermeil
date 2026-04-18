const { SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const { buildNowPlayingMessage } = require("../../utils/musicUtils");
module.exports = {
  name:"nowplaying", description:"Show the current track.", category:"music",
  aliases:["current"], usage:"", cooldown:5,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("nowplaying").setDescription("Show the current track.").toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    if (ctx.type==="slash") await ctx.interaction.deferReply();
    const player = client.riffy?.players.get(guild.id);
    if (!player || !player.current) {
      const err = embeds.error("Nothing is playing.");
      return ctx.type==="prefix" ? reply(ctx,{embeds:[err]}) : ctx.interaction.editReply({embeds:[err]});
    }
    const currentMs = player.trackStartTime ? Date.now() - player.trackStartTime : 0;
    const payload   = await buildNowPlayingMessage(player, player.current, currentMs);
    if (ctx.type==="prefix") await ctx.message.channel.send(payload);
    else await ctx.interaction.editReply(payload);
  },
};
