// ============================================================
//  commands/economy/leaderboard.js
//  Weekly and lifetime leaderboards
// ============================================================
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getWeeklyLeaderboard, getLifetimeLeaderboard, buildLbEmbed } = require("../../utils/ecoLeaderboardUtils");
const { formatNum }    = require("../../utils/ecoUtils");
const eco              = require("../../emojis/ecoemoji");
const lbConfig         = require("../../ecoconfiguration/leaderboard");

module.exports = {
  name: "eco leaderboard", description: "View economy leaderboards.", category: "economy",
  aliases: ["elb", "etop"], usage: "[weekly|lifetime] [category]", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const type = ctx.args[0]?.toLowerCase() ?? "weekly";

    const categories = type === "lifetime" ? lbConfig.lifetimeCategories : lbConfig.weeklyCategories;

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`lb_select_${message.author.id}`)
      .setPlaceholder("Select a leaderboard category...")
      .addOptions(categories.map(c =>
        new StringSelectMenuOptionBuilder().setLabel(c.label).setValue(c.field)
      ));

    const row = new ActionRowBuilder().addComponents(menu);

    const msg = await message.reply({
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`${eco.lb} ${type === "lifetime" ? "Lifetime" : "Weekly"} Leaderboards`).setDescription("Select a category below to view the leaderboard!")],
      components: [row],
    });

    const filter = i => i.user.id === message.author.id && i.customId === `lb_select_${message.author.id}`;
    const coll   = msg.createMessageComponentCollector({ filter, time: 60_000, max: 5 });

    coll.on("collect", async i => {
      await i.deferUpdate();
      const field    = i.values[0];
      const catConf  = categories.find(c => c.field === field);
      const entries  = type === "lifetime"
        ? await getLifetimeLeaderboard(client, field)
        : await getWeeklyLeaderboard(client, field);

      const embed = buildLbEmbed(`${type === "lifetime" ? "Lifetime" : "Weekly"} — ${catConf.label}`, entries, field, eco.coin, client);
      await msg.edit({ embeds: [embed], components: [row] });
    });

    coll.on("end", () => msg.edit({ components: [] }).catch(() => {}));
  },
};
