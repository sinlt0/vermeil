// ============================================================
//  commands/economy/beg.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { addCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, getProfile, formatNum } = require("../../utils/ecoUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco       = require("../../emojis/ecoemoji");
const genConfig = require("../../ecoconfiguration/general");

module.exports = {
  name: "beg", description: "Beg for some coins.", category: "economy",
  aliases: [], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const profile = await getProfile(client, message.author.id);
    const cfg     = genConfig.beg;

    if (!isCooldownReady(profile.cooldowns?.beg, cfg.cooldownMs)) {
      const rem = getRemainingCooldown(profile.cooldowns?.beg, cfg.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${eco.cooldown} Wait **${formatCooldown(rem)}** before begging again.`)] });
    }

    await setCooldown(client, message.author.id, "beg");
    await updateQuestProgress(client, message.author.id, "beg", 1);

    if (Math.random() < cfg.failChance) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription(`${eco.beg} You begged but nobody gave you anything... 😢`)] });
    }

    const reward = Math.floor(Math.random() * (cfg.maxCoins - cfg.minCoins + 1)) + cfg.minCoins;
    await addCoins(client, message.author.id, reward, "beg");

    const responses = [
      `A kind stranger gave you ${eco.coin} **${formatNum(reward)} coins**! 🙏`,
      `Someone took pity on you and gave ${eco.coin} **${formatNum(reward)} coins**.`,
      `You begged outside a restaurant and received ${eco.coin} **${formatNum(reward)} coins**!`,
    ];

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
      .setDescription(responses[Math.floor(Math.random() * responses.length)])] });
  },
};
