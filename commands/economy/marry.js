// ============================================================
//  commands/economy/marry.js
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { ecoCheck }   = require("../../utils/ecoMiddleware");
const { getProfile, removeCoins, formatNum } = require("../../utils/ecoUtils");
const eco          = require("../../emojis/ecoemoji");
const marriageConf = require("../../ecoconfiguration/marriage");

module.exports = {
  name: "marry", description: "Propose to another user.", category: "economy",
  aliases: ["propose"], usage: "<@user>", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target = message.mentions.users.first();
    if (!target) return message.reply(`${eco.error} Mention someone to propose to!`);
    if (target.id === message.author.id) return message.reply(`${eco.error} You can't marry yourself!`);
    if (target.bot) return message.reply(`${eco.error} You can't marry a bot!`);

    const proposer  = await getProfile(client, message.author.id);
    const targetProf = await getProfile(client, target.id);

    if (!targetProf?.agreedToTos) return message.reply(`${eco.error} **${target.username}** hasn't started the economy yet!`);
    if (proposer.marriedTo) return message.reply(`${eco.error} You're already married! Use \`!divorce\` first.`);
    if (targetProf.marriedTo) return message.reply(`${eco.error} **${target.username}** is already married!`);
    if (proposer.wallet < marriageConf.marriageCost) return message.reply(`${eco.error} Marriage costs ${eco.coin} **${formatNum(marriageConf.marriageCost)} coins**.`);

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.marry} Marriage Proposal!`)
      .setDescription(`**${message.author.username}** has proposed to **${target.username}**! 💍\n\n<@${target.id}>, do you accept?`)
      .setFooter({ text: `Cost: ${formatNum(marriageConf.marriageCost)} coins • Expires in 60s` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`marry_accept_${message.author.id}`).setLabel("Accept 💍").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`marry_decline_${message.author.id}`).setLabel("Decline 💔").setStyle(ButtonStyle.Danger),
    );

    const msg = await message.reply({ content: `<@${target.id}>`, embeds: [embed], components: [row] });

    const filter = i => i.user.id === target.id &&
      (i.customId === `marry_accept_${message.author.id}` || i.customId === `marry_decline_${message.author.id}`);
    const interaction = await msg.awaitMessageComponent({ filter, time: 60_000 }).catch(() => null);

    if (!interaction || interaction.customId === `marry_decline_${message.author.id}`) {
      await msg.edit({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.bust} The proposal was declined. 💔`)], components: [] });
      return;
    }

    await interaction.deferUpdate();
    await removeCoins(client, message.author.id, marriageConf.marriageCost, "marriage");

    const UserProfile = client.ecoDb.getModel("Userprofile");
    const Marriage    = client.ecoDb.getModel("Marriage");

    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $set: { marriedTo: target.id, marriedAt: new Date() } });
    await UserProfile.findOneAndUpdate({ userId: target.id },        { $set: { marriedTo: message.author.id, marriedAt: new Date() } });
    await Marriage.create({ user1: message.author.id, user2: target.id, type: "marriage" });

    await msg.edit({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
      .setTitle(`${eco.marry} Just Married! 🎊`)
      .setDescription(`**${message.author.username}** and **${target.username}** are now married! 💍\nYou both receive a **+${marriageConf.marriageBonus * 100}% coin earning bonus** when grinding together!`)], components: [] });
  },
};
