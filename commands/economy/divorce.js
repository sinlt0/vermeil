// ============================================================
//  commands/economy/divorce.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, removeCoins, formatNum } = require("../../utils/ecoUtils");
const eco          = require("../../emojis/ecoemoji");
const marriageConf = require("../../ecoconfiguration/marriage");

module.exports = {
  name: "ecodivorce", description: "Divorce your partner.", category: "economy",
  aliases: [], usage: "", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    if (!profile.marriedTo) return message.reply(`${eco.error} You're not married!`);
    if (profile.wallet < marriageConf.divorceCost) return message.reply(`${eco.error} Divorce costs ${eco.coin} **${formatNum(marriageConf.divorceCost)} coins**.`);

    await removeCoins(client, message.author.id, marriageConf.divorceCost, "divorce");

    const UserProfile = client.ecoDb.getModel("Userprofile");
    const Marriage    = client.ecoDb.getModel("Marriage");

    await UserProfile.findOneAndUpdate({ userId: message.author.id },   { $set: { marriedTo: null, marriedAt: null } });
    await UserProfile.findOneAndUpdate({ userId: profile.marriedTo },   { $set: { marriedTo: null, marriedAt: null } });
    await Marriage.findOneAndDelete({ $or: [{ user1: message.author.id }, { user2: message.author.id }] });

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
      .setDescription(`${eco.bust} You got divorced. 💔 Cost: ${eco.coin} ${formatNum(marriageConf.divorceCost)} coins.`)] });
  },
};
