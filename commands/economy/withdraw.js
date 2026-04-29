// ============================================================
//  commands/economy/withdraw.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, withdrawFromBank, formatNum } = require("../../utils/ecoUtils");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "ewithdraw", description: "Withdraw coins from your bank.", category: "economy",
  aliases: ["ewith", "ewd"], usage: "<amount|all|half>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const arg     = ctx.args[0]?.toLowerCase();

    let amount;
    if (arg === "all")  amount = profile.bank;
    else if (arg === "half") amount = Math.floor(profile.bank / 2);
    else amount = parseInt(arg?.replace(/,/g, ""));

    if (!amount || amount <= 0 || isNaN(amount)) return message.reply(`${eco.error} Please provide a valid amount. Example: \`!withdraw 1000\``);
    if (amount > profile.bank) return message.reply(`${eco.error} You only have **${formatNum(profile.bank)}** coins in your bank!`);

    const result = await withdrawFromBank(client, message.author.id, amount);
    const embed  = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.withdraw} Withdrawn!`)
      .setDescription(`Withdrew ${eco.coin} **${formatNum(result.withdrawn)}** coins from your bank.`)
      .addFields(
        { name: `${eco.wallet} Wallet`, value: `${eco.coin} ${formatNum(result.profile.wallet)}`, inline: true },
        { name: `${eco.bank} Bank`,     value: `${eco.coin} ${formatNum(result.profile.bank)}`,   inline: true },
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
