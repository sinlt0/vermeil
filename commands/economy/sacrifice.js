// ============================================================
//  commands/economy/sacrifice.js
//  Sacrifice a creature for coins
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { addCoins, formatNum } = require("../../utils/ecoUtils");
const eco        = require("../../emojis/ecoemoji");
const huntConfig = require("../../ecoconfiguration/hunt");

module.exports = {
  name: "sacrifice", description: "Sacrifice a creature for coins.", category: "economy",
  aliases: ["sac"], usage: "<position>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const pos = parseInt(ctx.args[0]);
    if (!pos || pos < 1) return message.reply(`${eco.error} Provide a valid position. Use \`!zoo\` to see positions.`);

    const Creature  = client.ecoDb.getModel("Creature");
    const creatures = await Creature.find({ userId: message.author.id }).sort({ rarity: -1, level: -1 }).lean();
    const target    = creatures[pos - 1];

    if (!target) return message.reply(`${eco.error} No creature at position **${pos}**.`);
    if (target.isTeam) return message.reply(`${eco.error} Remove this creature from your team first.`);

    const rarity  = huntConfig.rarities.find(r => r.name === target.rarity);
    const reward  = Math.floor(rarity.coinReward.max * huntConfig.sacrificeMultiplier);

    await Creature.deleteOne({ _id: target._id });
    await addCoins(client, message.author.id, reward, "sacrifice");

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
      .setDescription(`${eco.sacrifice} Sacrificed ${target.emoji} **${target.name}** for ${eco.coin} **${formatNum(reward)} coins**.`)] });
  },
};
