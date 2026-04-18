const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
module.exports = {
  name:"volume", description:"Set the player volume (1-200).", category:"music",
  aliases:["vol"], usage:"<1-200>", cooldown:2,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("volume").setDescription("Set the player volume.")
    .addIntegerOption(o=>o.setName("amount").setDescription("Volume 1-200.").setRequired(true).setMinValue(1).setMaxValue(200)).toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    const vol = ctx.type==="prefix" ? parseInt(ctx.args[0]) : ctx.interaction.options.getInteger("amount");
    if (!vol || vol < 1 || vol > 200) return reply(ctx, { embeds:[embeds.error("Volume must be between 1 and 200.")] });
    player.setVolume(vol);
    const volEmoji = vol === 0 ? emoji.volumeMute : vol < 50 ? emoji.volumeDown : emoji.volumeUp;
    const bar = "█".repeat(Math.floor(vol/10)) + "░".repeat(20-Math.floor(vol/10));
    const embed = new EmbedBuilder().setColor(0x5865F2)
      .setDescription(`${volEmoji} Volume set to **${vol}%**\n\`${bar}\``).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
