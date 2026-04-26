const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
module.exports = {
  name:"autoplay", description:"Toggle autoplay mode.", category:"music",
  aliases:["ap"], usage:"", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("autoplay").setDescription("Toggle autoplay — plays related tracks when queue ends.").toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    player.autoplay = !player.autoplay;
    if (typeof player.setAutoplay === "function") player.setAutoplay(player.autoplay);
    const embed = new EmbedBuilder().setColor(0x4A3F5F)
      .setDescription(`${emoji.autoplay} Autoplay is now **${player.autoplay ? "enabled" : "disabled"}**.`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
