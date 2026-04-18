// ============================================================
//  commands/economy/bond.js
//  Create/view/break bonds with other users
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { ecoCheck }   = require("../../utils/ecoMiddleware");
const { getProfile, removeCoins, formatNum } = require("../../utils/ecoUtils");
const eco          = require("../../emojis/ecoemoji");
const marriageConf = require("../../ecoconfiguration/marriage");

module.exports = {
  name: "bond", description: "Create or manage bonds with users.", category: "economy",
  aliases: [], usage: "<@user | break @user | list>", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Marriage    = client.ecoDb.getModel("Marriage");
    const UserProfile = client.ecoDb.getModel("Userprofile");
    const sub         = ctx.args[0]?.toLowerCase();

    // List bonds
    if (sub === "list") {
      const bonds = await Marriage.find({ $or: [{ user1: message.author.id }, { user2: message.author.id }], type: "bond" }).lean();
      if (!bonds.length) return message.reply(`${eco.error} You have no bonds! Use \`!bond @user\` to create one.`);

      const lines = bonds.map(b => {
        const partner = b.user1 === message.author.id ? b.user2 : b.user1;
        return `${eco.bond} <@${partner}> — Level ${b.bondLevel} | XP: ${b.bondXp}`;
      });

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2)
        .setTitle(`${eco.bond} Your Bonds`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: `${bonds.length}/${marriageConf.maxBonds} bonds` })
        .setTimestamp()] });
    }

    const target = message.mentions.users.first();
    if (!target) return message.reply(`${eco.error} Mention a user! \`!bond @user\``);

    // Break bond
    if (sub === "break") {
      const bond = await Marriage.findOne({
        $or: [{ user1: message.author.id, user2: target.id }, { user1: target.id, user2: message.author.id }],
        type: "bond",
      });
      if (!bond) return message.reply(`${eco.error} You don't have a bond with **${target.username}**.`);
      if (getProfile(client, message.author.id).wallet < marriageConf.breakBondCost) return message.reply(`${eco.error} Breaking a bond costs ${eco.coin} **${formatNum(marriageConf.breakBondCost)} coins**.`);

      await removeCoins(client, message.author.id, marriageConf.breakBondCost, "break_bond");
      await Marriage.deleteOne({ _id: bond._id });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.bust} Bond with **${target.username}** broken.`)] });
    }

    // Create bond
    if (target.id === message.author.id || target.bot) return message.reply(`${eco.error} Invalid target!`);

    const targetProf = await getProfile(client, target.id);
    if (!targetProf?.agreedToTos) return message.reply(`${eco.error} **${target.username}** hasn't started the economy yet!`);

    const existingBonds = await Marriage.countDocuments({ $or: [{ user1: message.author.id }, { user2: message.author.id }], type: "bond" });
    if (existingBonds >= marriageConf.maxBonds) return message.reply(`${eco.error} You can only have ${marriageConf.maxBonds} bonds at a time!`);

    const alreadyBonded = await Marriage.findOne({
      $or: [{ user1: message.author.id, user2: target.id }, { user1: target.id, user2: message.author.id }],
      type: "bond",
    });
    if (alreadyBonded) return message.reply(`${eco.error} You're already bonded with **${target.username}**!`);

    const profile = await getProfile(client, message.author.id);
    if (profile.wallet < marriageConf.bondCost) return message.reply(`${eco.error} Bonding costs ${eco.coin} **${formatNum(marriageConf.bondCost)} coins**.`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bond_accept_${message.author.id}`).setLabel("Accept Bond 🤝").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`bond_decline_${message.author.id}`).setLabel("Decline").setStyle(ButtonStyle.Secondary),
    );

    const msg = await message.reply({
      content: `<@${target.id}>`,
      embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`${eco.bond} Bond Request`)
        .setDescription(`**${message.author.username}** wants to bond with you!\n\nBond benefits include shared XP, coin bonuses, and more!\n\nCost: ${eco.coin} **${formatNum(marriageConf.bondCost)} coins**`)],
      components: [row],
    });

    const filter = i => i.user.id === target.id && (i.customId === `bond_accept_${message.author.id}` || i.customId === `bond_decline_${message.author.id}`);
    const interaction = await msg.awaitMessageComponent({ filter, time: 60_000 }).catch(() => null);

    if (!interaction || interaction.customId === `bond_decline_${message.author.id}`) {
      await msg.edit({ embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription(`${eco.error} Bond request declined.`)], components: [] });
      return;
    }

    await interaction.deferUpdate();
    await removeCoins(client, message.author.id, marriageConf.bondCost, "bond");
    await Marriage.create({ user1: message.author.id, user2: target.id, type: "bond" });
    await msg.edit({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle(`${eco.bond} Bond Created!`).setDescription(`**${message.author.username}** and **${target.username}** are now bonded! 🤝\n\nLevel up your bond by being active together!`)], components: [] });
  },
};
