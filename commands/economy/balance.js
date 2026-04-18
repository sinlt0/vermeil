// ============================================================
//  commands/economy/balance.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, formatNum } = require("../../utils/ecoUtils");
const eco        = require("../../emojis/ecoemoji");
const bankConfig = require("../../ecoconfiguration/bank");

module.exports = {
  name: "balance", description: "Check your balance.", category: "economy",
  aliases: ["bal", "coins", "money"], usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target  = message.mentions.users.first() ?? message.author;
    const profile = await getProfile(client, target.id);
    if (!profile?.agreedToTos) return message.reply(`${eco.error} **${target.username}** hasn't started yet!`);

    const bankLimit = profile.bankLimit ?? bankConfig.defaultLimit;
    const embed     = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: `${target.username}'s Balance`, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .addFields(
        { name: `${eco.wallet} Wallet`,     value: `${eco.coin} **${formatNum(profile.wallet)}**`,                                 inline: true },
        { name: `${eco.bank} Bank`,         value: `${eco.coin} **${formatNum(profile.bank)}** / ${formatNum(bankLimit)}`,         inline: true },
        { name: `${eco.gem} Gems`,          value: `${eco.gem} **${formatNum(profile.gems)}**`,                                   inline: true },
        { name: `${eco.token} Tokens`,      value: `${eco.token} **${formatNum(profile.tokens)}**`,                               inline: true },
        { name: `${eco.networth} Net Worth`,value: `${eco.coin} **${formatNum(profile.wallet + profile.bank)}**`,                 inline: true },
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
