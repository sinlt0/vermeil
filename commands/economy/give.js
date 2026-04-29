// ============================================================
//  commands/economy/give.js
//  User to user coin transfer with tax
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, removeCoins, formatNum } = require("../../utils/ecoUtils");
const eco       = require("../../emojis/ecoemoji");
const genConfig = require("../../ecoconfiguration/general");

module.exports = {
  name: "ecogive", description: "Give coins to another user.", category: "economy",
  aliases: ["ecopay", "ecotransfer"], usage: "<@user> <amount>", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target = message.mentions.users.first();
    const amount = parseInt(ctx.args[1]?.replace(/,/g, "") || ctx.args[0]?.replace(/,/g, ""));

    if (!target) return message.reply(`${eco.error} Mention a user to give coins to!`);
    if (target.id === message.author.id) return message.reply(`${eco.error} You can't give coins to yourself!`);
    if (target.bot) return message.reply(`${eco.error} You can't give coins to a bot!`);

    const cfg = genConfig.pay;
    if (!amount || amount < cfg.minAmount) return message.reply(`${eco.error} Min amount is **${formatNum(cfg.minAmount)}** coins.`);
    if (amount > cfg.maxAmount) return message.reply(`${eco.error} Max amount is **${formatNum(cfg.maxAmount)}** coins per transfer.`);

    const targetProfile = await getProfile(client, target.id);
    if (!targetProfile?.agreedToTos) return message.reply(`${eco.error} **${target.username}** hasn't started the economy yet!`);

    const sender = await getProfile(client, message.author.id);
    if (sender.wallet < amount) return message.reply(`${eco.error} You only have ${eco.coin} **${formatNum(sender.wallet)}** coins!`);

    // Apply tax
    const tax      = Math.floor(amount * cfg.taxRate);
    const received = amount - tax;

    await removeCoins(client, message.author.id, amount, "give");
    await addCoins(client, target.id, received, "received");

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.pay} Transfer Complete`)
      .setDescription(`Sent ${eco.coin} **${formatNum(amount)}** to **${target.username}**`)
      .addFields(
        { name: "Sent",     value: `${eco.coin} ${formatNum(amount)}`,   inline: true },
        { name: "Tax (5%)", value: `${eco.coin} ${formatNum(tax)}`,      inline: true },
        { name: "Received", value: `${eco.coin} ${formatNum(received)}`, inline: true },
      )
      .setTimestamp()] });
  },
};
