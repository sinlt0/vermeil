const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
module.exports = {
  name:"skip", description:"Skip the current track.", category:"music",
  aliases:["s","next"], usage:"", cooldown:2,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("skip").setDescription("Skip the current track.").toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    const current = player.current?.info?.title ?? "Unknown";
    player.stop();
    const embed = new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${emoji.skip} Skipped **${current}**.`).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
