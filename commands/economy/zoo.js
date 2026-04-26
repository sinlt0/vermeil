// ============================================================
//  commands/economy/zoo.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { rarityEmoji }  = require("../../utils/ecoHuntUtils");
const eco              = require("../../emojis/ecoemoji");
const huntConfig       = require("../../ecoconfiguration/hunt");

module.exports = {
  name: "zoo", description: "View your creature collection.", category: "economy",
  aliases: ["creatures", "collection"], usage: "[page]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target   = message.mentions.users.first() ?? message.author;
    const Creature = client.ecoDb.getModel("Creature");
    const page     = Math.max(1, parseInt(ctx.args[0]) || 1);
    const perPage  = 10;
    const skip     = (page - 1) * perPage;

    const total     = await Creature.countDocuments({ userId: target.id });
    const creatures = await Creature.find({ userId: target.id })
      .sort({ rarity: -1, level: -1 })
      .skip(skip).limit(perPage).lean();

    if (!total) return message.reply(`${eco.error} **${target.username}** has no creatures! Use \`!hunt\` to catch some.`);

    const rarityOrder = ["legendary","epic","rare","uncommon","common"];
    const lines = creatures.map((c, i) =>
      `\`${skip + i + 1}.\` ${rarityEmoji(c.rarity)} ${c.emoji} **${c.name}** Lv.${c.level} ${c.isTeam ? `⚔️ Team[${c.teamSlot}]` : ""}`
    );

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.zoo} ${target.username}'s Zoo`)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${total}/${huntConfig.zooCapacity} creatures • Page ${page}/${Math.ceil(total/perPage)}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
