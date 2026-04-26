// ============================================================
//  commands/economy/start.js
//  Create economy profile + agree to TOS
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isEcoReady, ecoReply, getProfile, ensureProfile } = require("../../utils/ecoUtils");
const eco        = require("../../emojis/ecoemoji");
const genConfig  = require("../../ecoconfiguration/general");

module.exports = {
  name:        "start",
  description: "Start your economy journey!",
  category:    "economy",
  aliases:     ["register", "begin"],
  usage:       "",
  cooldown:    5,
  slash:       false,

  async execute(client, ctx) {
    const message = ctx.message;
    const user    = message.author;

    if (!isEcoReady(client)) return ecoReply(message, `${eco.error} Economy system is not available right now.`);

    const existing = await getProfile(client, user.id);
    if (existing?.agreedToTos) {
      return ecoReply(message, `${eco.error} You already have an economy profile! Use \`!profile\` to view it.`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.sparkles} Welcome to the Economy!`)
      .setDescription(
        `Hello **${user.username}**! Welcome to the most advanced economy system.\n\n` +
        `**What you can do:**\n` +
        `${eco.work} Work jobs and earn coins\n` +
        `${eco.hunt} Hunt and collect rare creatures\n` +
        `${eco.battle} Battle other players\n` +
        `${eco.slots} Gamble at the casino\n` +
        `${eco.shop} Buy items from the shop\n` +
        `${eco.marry} Marry or bond with friends\n` +
        `${eco.clan} Join or create a clan\n\n` +
        `**Starter Pack:** ${eco.coin} **${genConfig.starter.coins.toLocaleString()} coins**\n\n` +
        `By clicking **I Agree** you agree to our Terms of Service and Privacy Policy.\n` +
        `> Do not exploit bugs. Do not use macros/scripts. Have fun! 🎉`
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "Click I Agree to start your journey!" })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`eco_start_agree_${user.id}`)
        .setLabel("I Agree — Start!")
        .setStyle(ButtonStyle.Success)
        .setEmoji(eco.success),
      new ButtonBuilder()
        .setCustomId(`eco_start_decline_${user.id}`)
        .setLabel("Decline")
        .setStyle(ButtonStyle.Secondary),
    );

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const filter = i => i.user.id === user.id &&
      (i.customId === `eco_start_agree_${user.id}` || i.customId === `eco_start_decline_${user.id}`);
    const interaction = await msg.awaitMessageComponent({ filter, time: 60_000 }).catch(() => null);

    if (!interaction || interaction.customId === `eco_start_decline_${user.id}`) {
      await msg.edit({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.error} Registration cancelled.`)], components: [] });
      return;
    }

    await interaction.deferUpdate();

    // Create profile
    const profile = await ensureProfile(client, user.id, user.username);
    profile.agreedToTos = true;
    profile.agreedAt    = new Date();
    profile.wallet      = genConfig.starter.coins;
    profile.username    = user.username;
    await profile.save();

    const successEmbed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.success} Welcome aboard, ${user.username}!`)
      .setDescription(
        `Your economy profile has been created!\n\n` +
        `${eco.coin} **Starting Balance:** ${genConfig.starter.coins.toLocaleString()} coins\n\n` +
        `**Get started:**\n` +
        `• \`!daily\` — Claim your daily reward\n` +
        `• \`!jobs\` — Browse available jobs\n` +
        `• \`!hunt\` — Hunt for creatures\n` +
        `• \`!shop\` — Visit the shop\n` +
        `• \`!help economy\` — See all commands`
      )
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await msg.edit({ embeds: [successEmbed], components: [] });
  },
};
