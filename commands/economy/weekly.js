// ============================================================
//  commands/economy/weekly.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, addCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, formatNum } = require("../../utils/ecoUtils");
const eco       = require("../../emojis/ecoemoji");
const genConfig = require("../../ecoconfiguration/general");

module.exports = {
  name: "weekly", description: "Claim your weekly reward.", category: "economy",
  aliases: ["week"], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const cfg     = genConfig.weekly;

    if (!isCooldownReady(profile.cooldowns?.weekly, cfg.cooldownMs)) {
      const remaining = getRemainingCooldown(profile.cooldowns?.weekly, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.cooldown} Weekly on cooldown! Come back in **${formatCooldown(remaining)}**.`)] });
    }

    await addCoins(client, message.author.id, cfg.base, "weekly");
    const UserProfile = client.ecoDb.getModel("Userprofile");
    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { gems: cfg.gems } });
    await setCooldown(client, message.author.id, "weekly");

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.weekly} Weekly Reward!`)
      .setDescription(`${eco.coin} **${formatNum(cfg.base)} coins** + ${eco.gem} **${cfg.gems} gems**!`)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
