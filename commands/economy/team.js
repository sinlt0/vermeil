// ============================================================
//  commands/economy/team.js
//  Manage battle team
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { rarityEmoji }  = require("../../utils/ecoHuntUtils");
const eco              = require("../../emojis/ecoemoji");
const battleConfig     = require("../../ecoconfiguration/battle");

module.exports = {
  name: "team", description: "Manage your battle team.", category: "economy",
  aliases: [], usage: "[add <zoo pos> | remove <slot> | view]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Creature = client.ecoDb.getModel("Creature");
    const sub      = ctx.args[0]?.toLowerCase();

    if (!sub || sub === "view") {
      const team = await Creature.find({ userId: message.author.id, isTeam: true }).sort({ teamSlot: 1 }).lean();
      if (!team.length) return message.reply(`${eco.error} Your team is empty! Use \`!team add <zoo position>\` to add creatures.`);

      const lines = team.map(c => `Slot ${c.teamSlot}: ${rarityEmoji(c.rarity)} ${c.emoji} **${c.name}** Lv.${c.level} | ❤️${c.hp} ⚔️${c.attack} 🛡️${c.defense}`);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`${eco.team} Your Battle Team`).setDescription(lines.join("\n")).setTimestamp()] });
    }

    if (sub === "add") {
      const zooPos = parseInt(ctx.args[1]);
      if (!zooPos) return message.reply(`${eco.error} Provide zoo position. Use \`!zoo\` to see positions.`);

      const teamCount = await Creature.countDocuments({ userId: message.author.id, isTeam: true });
      if (teamCount >= battleConfig.maxTeamSize) return message.reply(`${eco.error} Your team is full! (Max ${battleConfig.maxTeamSize})`);

      const creatures = await Creature.find({ userId: message.author.id }).sort({ rarity: -1, level: -1 }).lean();
      const creature  = creatures[zooPos - 1];
      if (!creature) return message.reply(`${eco.error} No creature at position ${zooPos}.`);
      if (creature.isTeam) return message.reply(`${eco.error} This creature is already in your team!`);

      const slot = teamCount + 1;
      await Creature.findByIdAndUpdate(creature._id, { $set: { isTeam: true, teamSlot: slot } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`${eco.success} Added ${creature.emoji} **${creature.name}** to team slot ${slot}!`)] });
    }

    if (sub === "remove") {
      const slot = parseInt(ctx.args[1]);
      if (!slot) return message.reply(`${eco.error} Provide slot number (1-${battleConfig.maxTeamSize}).`);

      const creature = await Creature.findOne({ userId: message.author.id, isTeam: true, teamSlot: slot });
      if (!creature) return message.reply(`${eco.error} No creature in slot ${slot}.`);

      await Creature.findByIdAndUpdate(creature._id, { $set: { isTeam: false, teamSlot: null } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287).setDescription(`${eco.success} Removed ${creature.emoji} **${creature.name}** from slot ${slot}.`)] });
    }
  },
};
