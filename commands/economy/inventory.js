// ============================================================
//  commands/economy/inventory.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "inventory", description: "View your item inventory.", category: "economy",
  aliases: ["inv", "items"], usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target    = message.mentions.users.first() ?? message.author;
    const Inventory = client.ecoDb.getModel("Inventory");
    const inv       = await Inventory.findOne({ userId: target.id }).lean();

    if (!inv?.items?.length) return message.reply(`${eco.error} **${target.username}**'s inventory is empty!`);

    const lines = inv.items.map(i => `${eco.item} **${i.name}** x${i.quantity}`);

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.inventory} ${target.username}'s Inventory`)
      .setDescription(lines.join("\n"))
      .setTimestamp()] });
  },
};
