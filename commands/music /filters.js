const { SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
const { buildFiltersMenu, applyFilter } = require("../../utils/musicUtils");

module.exports = {
  name:"filters", description:"Apply audio filters.", category:"music",
  aliases:["filter","fx"], usage:"", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("filters").setDescription("Apply audio filters via dropdown.").toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type==="prefix" ? ctx.message.member : ctx.interaction.member;
    if (!member.voice.channel) return reply(ctx, { embeds:[embeds.error("You must be in a voice channel.")] });
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });

    const msg = await (ctx.type==="prefix"
      ? ctx.message.channel.send({ embeds:[embeds.info("Select a filter from the dropdown below.", `${emoji.filter} Audio Filters`)], components:[buildFiltersMenu()] })
      : ctx.interaction.reply({ embeds:[embeds.info("Select a filter from the dropdown below.", `${emoji.filter} Audio Filters`)], components:[buildFiltersMenu()], fetchReply:true }));

    const filter = i => i.customId==="music_filter_select" && i.user.id===(ctx.type==="prefix"?ctx.message.author.id:ctx.interaction.user.id);
    const coll   = msg.createMessageComponentCollector({ filter, time:30000, max:1 });

    coll.on("collect", async i => {
      const name = i.values[0];
      await applyFilter(player, name);
      const label = name==="none" ? "Filters cleared" : `**${name.charAt(0).toUpperCase()+name.slice(1)}** filter applied`;
      await i.update({ embeds:[embeds.success(`${emoji.filter} ${label}.`, "Filters")], components:[] });
    });

    coll.on("end", (_,reason) => { if (reason==="time") msg.edit({ components:[] }).catch(()=>{}); });
  },
};
