const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
module.exports = {
  name:"loop", description:"Toggle loop mode (off/track/queue).", category:"music",
  aliases:["repeat"], usage:"[off|track|queue]", cooldown:2,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("loop").setDescription("Toggle loop mode.")
    .addStringOption(o=>o.setName("mode").setDescription("Loop mode.").setRequired(false)
      .addChoices({name:"Off",value:"none"},{name:"Track",value:"track"},{name:"Queue",value:"queue"})).toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });
    const mode = ctx.type==="prefix" ? (ctx.args[0]?.toLowerCase()||null) : ctx.interaction.options.getString("mode");
    // Cycle if no mode given
    const cycles = { none:"track", track:"queue", queue:"none" };
    const newMode = mode ?? cycles[player.loop ?? "none"];
    player.setLoop(newMode === "none" ? null : newMode);
    const labels = { none:`${emoji.noLoop} Loop **disabled**.`, track:`${emoji.loop} Looping **current track**.`, queue:`${emoji.loopAll} Looping **entire queue**.` };
    const embed = new EmbedBuilder().setColor(0x5865F2).setDescription(labels[newMode]).setTimestamp();
    return reply(ctx, { embeds:[embed] });
  },
};
