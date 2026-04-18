const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");
const emoji     = require("../../emojis/musicemoji");
const { formatDuration } = require("../../utils/musicUtils");

const PAGE_SIZE = 10;

module.exports = {
  name:"queue", description:"Show the music queue.", category:"music",
  aliases:["q"], usage:"[page]", cooldown:3,
  ownerOnly:false, devOnly:false, requiresDatabase:false, slash:true,
  slashData: new SlashCommandBuilder().setName("queue").setDescription("Show the music queue.")
    .addIntegerOption(o=>o.setName("page").setDescription("Page number.").setRequired(false).setMinValue(1)).toJSON(),
  async execute(client, ctx) {
    const guild  = ctx.type==="prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const player = client.riffy?.players.get(guild.id);
    if (!player) return reply(ctx, { embeds:[embeds.error("Nothing is playing.")] });

    const queue  = player.queue;
    const pages  = Math.max(1, Math.ceil(queue.length / PAGE_SIZE));
    let page     = ctx.type==="prefix" ? (parseInt(ctx.args[0])||1) : (ctx.interaction.options.getInteger("page")||1);
    page         = Math.min(Math.max(page, 1), pages);

    const buildQueueEmbed = (pg) => {
      const start  = (pg-1) * PAGE_SIZE;
      const tracks = queue.slice(start, start+PAGE_SIZE);
      const totalDur = queue.reduce((a,t)=>a+(t.info.length||0),0);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${emoji.queue} Music Queue — ${guild.name}`)
        .setDescription(
          (player.current ? `**Now Playing:**\n${emoji.play} **[${player.current.info.title}](${player.current.info.uri})**\n\n` : "") +
          (tracks.length > 0
            ? tracks.map((t,i)=>`\`${start+i+1}.\` **[${t.info.title}](${t.info.uri})**\n${emoji.mic} ${t.info.author} • ${formatDuration(t.info.length)} • ${emoji.user} ${t.info.requester?.username||"Unknown"}`).join("\n\n")
            : "*Queue is empty.*")
        )
        .addFields(
          { name:`${emoji.music} Total Tracks`, value:`${queue.length}`,        inline:true },
          { name:`${emoji.clock} Total Duration`, value:formatDuration(totalDur), inline:true },
          { name:`${emoji.notes} Page`, value:`${pg}/${pages}`,                  inline:true },
        )
        .setTimestamp();
      return embed;
    };

    const buildNav = (pg) => {
      const options = [];
      if (pg > 1)     options.push(new StringSelectMenuOptionBuilder().setLabel("◀ Previous Page").setValue(`queue_prev_${pg}`).setEmoji(emoji.backward));
      if (pg < pages) options.push(new StringSelectMenuOptionBuilder().setLabel("▶ Next Page").setValue(`queue_next_${pg}`).setEmoji(emoji.forward));
      options.push(new StringSelectMenuOptionBuilder().setLabel("✖ Close").setValue("queue_close").setEmoji("✖️"));
      if (options.length === 0) return [];
      return [new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`queue_nav_${guild.id}`).setPlaceholder("Navigate pages...").addOptions(options)
      )];
    };

    const msg = await (ctx.type==="prefix"
      ? ctx.message.channel.send({ embeds:[buildQueueEmbed(page)], components:buildNav(page) })
      : (await ctx.interaction.reply({ embeds:[buildQueueEmbed(page)], components:buildNav(page), fetchReply:true })));

    // Collector for navigation
    const filter = i => i.customId===`queue_nav_${guild.id}` && i.user.id===(ctx.type==="prefix"?ctx.message.author.id:ctx.interaction.user.id);
    const coll   = msg.createMessageComponentCollector({ filter, time:60000 });

    coll.on("collect", async i => {
      const val = i.values[0];
      if (val==="queue_close") { await msg.delete().catch(()=>{}); return coll.stop(); }
      const dir  = val.startsWith("queue_next") ? 1 : -1;
      const cur  = parseInt(val.split("_").pop());
      const newPg = Math.min(Math.max(cur+dir,1),pages);
      await i.update({ embeds:[buildQueueEmbed(newPg)], components:buildNav(newPg) });
    });

    coll.on("end", () => msg.edit({ components:[] }).catch(()=>{}));
  },
};
