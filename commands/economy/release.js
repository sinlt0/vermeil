// ============================================================
//  commands/economy/release.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const eco              = require("../../emojis/ecoemoji");

module.exports = {
  name: "release", description: "Release a creature from your zoo.", category: "economy",
  aliases: [], usage: "<position>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const pos      = parseInt(ctx.args[0]);
    if (!pos || pos < 1) return message.reply(`${eco.error} Provide a valid position. Use \`!zoo\` to see positions.`);

    const Creature  = client.ecoDb.getModel("Creature");
    const creatures = await Creature.find({ userId: message.author.id }).sort({ rarity: -1, level: -1 }).lean();
    const target    = creatures[pos - 1];

    if (!target) return message.reply(`${eco.error} No creature at position **${pos}**.`);
    if (target.isTeam) return message.reply(`${eco.error} Remove this creature from your team first with \`!team remove ${target.teamSlot}\`.`);

    await Creature.deleteOne({ _id: target._id });
    return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
      .setDescription(`${eco.release} Released ${target.emoji} **${target.name}** back into the wild.`)] });
  },
};
