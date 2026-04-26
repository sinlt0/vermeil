// ============================================================
//  commands/economy/use.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { useItem }      = require("../../utils/ecoShopUtils");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "use", description: "Use an item from your inventory.", category: "economy",
  aliases: [], usage: "<item_id>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const itemId = ctx.args[0]?.toLowerCase();
    if (!itemId) return message.reply(`${eco.error} Provide an item ID. Use \`!inventory\` to see your items.`);

    const result = await useItem(client, message.author.id, itemId);
    const color  = result.success ? 0x57F287 : 0xED4245;
    const icon   = result.success ? eco.success : eco.error;

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
      .setDescription(`${icon} ${result.msg}`).setTimestamp()] });
  },
};
