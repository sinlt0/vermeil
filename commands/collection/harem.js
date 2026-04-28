// ============================================================
//  commands/collection/harem.js
//  $mymarry / $mm [@user] [page]  — view your harem
//  $harem / $ha  [@user] [page]  — same
// ============================================================
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require("discord.js");
const { getHaremPage, SORT_MODES } = require("../../utils/collection/haremUtils");

module.exports = {
  name: "mymarry", description: "View your character harem.",
  category: "collection", aliases: ["mm","harem","ha"],
  usage: "[@user] [page]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message  = ctx.message;
    const guild    = message.guild;
    const target   = message.mentions.users.first() ?? message.author;
    const pageArg  = parseInt(ctx.args.find(a => /^\d+$/.test(a))) || 1;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    let page     = pageArg - 1;
    let sortMode = "po";
    let filter   = null;

    const renderPage = async () => {
      const result = await getHaremPage(guildDb.connection, guild, target, page, sortMode, filter);

      const sortMenu = new StringSelectMenuBuilder()
        .setCustomId(`harem_sort_${message.id}`)
        .setPlaceholder(`Sort: ${SORT_MODES[sortMode]?.label ?? "Position"}`)
        .addOptions(
          Object.entries(SORT_MODES).map(([key, val]) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(val.label).setValue(key).setDefault(key === sortMode)
          )
        );

      const filterMenu = new StringSelectMenuBuilder()
        .setCustomId(`harem_filter_${message.id}`)
        .setPlaceholder(filter ? `Filter: ${filter}` : "Filter: All")
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel("All").setValue("all").setDefault(!filter),
          new StringSelectMenuOptionBuilder().setLabel("💕 Waifus").setValue("waifu").setDefault(filter === "waifu"),
          new StringSelectMenuOptionBuilder().setLabel("💙 Husbandos").setValue("husbando").setDefault(filter === "husbando"),
        );

      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("harem_prev").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("harem_first").setLabel("⏮").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("harem_home").setLabel(`${page + 1}/${result.pages}`).setStyle(ButtonStyle.Primary).setDisabled(true),
        new ButtonBuilder().setCustomId("harem_last").setLabel("⏭").setStyle(ButtonStyle.Secondary).setDisabled(page >= result.pages - 1),
        new ButtonBuilder().setCustomId("harem_next").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(page >= result.pages - 1),
      );

      return {
        embeds: [result.embed],
        components: [
          new ActionRowBuilder().addComponents(sortMenu),
          new ActionRowBuilder().addComponents(filterMenu),
          navRow,
        ],
      };
    };

    const msg = await message.reply(await renderPage());

    const collector = msg.createMessageComponentCollector({
      filter: i => {
        if (i.user.id !== message.author.id) { i.reply({ content: "❌ Not your harem!", ephemeral: true }); return false; }
        return true;
      },
      time: 120_000,
    });

    collector.on("collect", async i => {
      await i.deferUpdate();
      if (i.customId === `harem_sort_${message.id}`)   sortMode = i.values[0];
      if (i.customId === `harem_filter_${message.id}`) filter   = i.values[0] === "all" ? null : i.values[0];
      if (i.customId === "harem_prev")  page = Math.max(0, page - 1);
      if (i.customId === "harem_next")  page++;
      if (i.customId === "harem_first") page = 0;
      if (i.customId === "harem_last")  page = 9999; // getHaremPage clamps it
      await msg.edit(await renderPage());
    });

    collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
  },
};
