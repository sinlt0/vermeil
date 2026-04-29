// ============================================================
//  commands/economy/deposit.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addToBank, formatNum } = require("../../utils/ecoUtils");
const eco        = require("../../emojis/ecoemoji");
const bankConfig = require("../../ecoconfiguration/bank");

module.exports = {
  name: "ecodeposit", description: "Deposit coins into your bank.", category: "economy",
  aliases: ["ecodep", "ecod"], usage: "<amount|all|half>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const arg     = ctx.args[0]?.toLowerCase();

    let amount;
    if (arg === "all")  amount = profile.wallet;
    else if (arg === "half") amount = Math.floor(profile.wallet / 2);
    else amount = parseInt(arg?.replace(/,/g, ""));

    if (!amount || amount <= 0 || isNaN(amount)) return message.reply(`${eco.error} Please provide a valid amount. Example: \`!deposit 1000\``);
    if (amount > profile.wallet) return message.reply(`${eco.error} You only have **${formatNum(profile.wallet)}** coins in your wallet!`);

    const result = await addToBank(client, message.author.id, amount);
    if (result.added === 0) return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.error} Your bank is full! Buy a **Banknote** from \`!shop\` to expand it.`)] });

    const bankLimit = result.profile.bankLimit ?? bankConfig.defaultLimit;
    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.deposit} Deposited!`)
      .addFields(
        { name: `${eco.wallet} Wallet`, value: `${eco.coin} ${formatNum(result.profile.wallet)}`, inline: true },
        { name: `${eco.bank} Bank`,     value: `${eco.coin} ${formatNum(result.profile.bank)} / ${formatNum(bankLimit)}`, inline: true },
      )
      .setDescription(`Deposited ${eco.coin} **${formatNum(result.added)}** coins into your bank.`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
