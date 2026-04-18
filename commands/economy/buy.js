// ============================================================
//  commands/economy/buy.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, removeCoins, formatNum } = require("../../utils/ecoUtils");
const { getShopItem, addItem } = require("../../utils/ecoShopUtils");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "buy", description: "Buy an item from the shop.", category: "economy",
  aliases: [], usage: "<item_id> [quantity]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const itemId  = ctx.args[0]?.toLowerCase();
    const qty     = Math.max(1, parseInt(ctx.args[1]) || 1);
    if (!itemId) return message.reply(`${eco.error} Provide an item ID. Use \`!shop\` to browse items.`);

    const item = getShopItem(itemId);
    if (!item) return message.reply(`${eco.error} Item **${itemId}** not found. Use \`!shop\` to browse.`);

    const profile = await getProfile(client, message.author.id);
    const total   = item.price * qty;

    if (item.currency === "coins") {
      if (profile.wallet < total) return message.reply(`${eco.error} Need ${eco.coin} **${formatNum(total)}** but only have **${formatNum(profile.wallet)}**.`);
      await removeCoins(client, message.author.id, total, "shop_buy");
    } else if (item.currency === "gems") {
      if (profile.gems < total) return message.reply(`${eco.error} Need ${eco.gem} **${total}** gems but only have **${formatNum(profile.gems)}**.`);
      const UserProfile = client.ecoDb.getModel("Userprofile");
      await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { gems: -total } });
    }

    await addItem(client, message.author.id, itemId, qty);

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
      .setDescription(`${eco.buy} Purchased ${item.emoji} **${item.name}** x${qty}!\nUse \`!use ${itemId}\` to activate it.`)
      .setTimestamp()] });
  },
};
