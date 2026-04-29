// ============================================================
//  commands/economy/shop.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { formatNum }    = require("../../utils/ecoUtils");
const eco      = require("../../emojis/ecoemoji");
const shopConf = require("../../ecoconfiguration/shop");

module.exports = {
  name: "ecoshop", description: "Browse the item shop.", category: "economy",
  aliases: ["ecostore"], usage: "[category]", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const catArg = ctx.args[0]?.toLowerCase();
    const cats   = shopConf.categories;

    if (catArg) {
      const cat = cats.find(c => c.name.toLowerCase() === catArg || c.name.toLowerCase().startsWith(catArg));
      if (!cat) return message.reply(`${eco.error} Category not found. Available: ${cats.map(c => c.name).join(", ")}`);

      const lines = cat.items.map(item =>
        `${item.emoji} **${item.name}** — \`!buy ${item.id}\`\n` +
        `┣ Price: **${formatNum(item.price)}** ${item.currency === "gems" ? eco.gem : eco.coin}\n` +
        `┗ ${item.description}`
      );

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${eco.shop} ${cat.emoji} ${cat.name}`)
        .setDescription(lines.join("\n\n"))
        .setTimestamp()] });
    }

    // Show all categories
    const lines = cats.map(cat =>
      `${cat.emoji} **${cat.name}** — ${cat.items.length} item(s) | \`!shop ${cat.name.toLowerCase()}\``
    );

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.shop} Item Shop`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Use !shop <category> to browse items • !buy <id> to purchase" })
      .setTimestamp()] });
  },
};
