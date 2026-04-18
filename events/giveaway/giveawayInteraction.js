// ============================================================
//  events/guild/giveawayInteraction.js
//  Handles giveaway entry button clicks
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: Giveaway } = require("../../models/Giveaway");
const { buildEmbed, buildRow }     = require("../../utils/giveawayUtils");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("gw_enter_")) return;
    if (!client.db) return;

    const messageId = interaction.customId.replace("gw_enter_", "");
    const guild     = interaction.guild;
    const member    = interaction.member;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return interaction.reply({ content: "❌ Database unavailable.", ephemeral: true });
    }

    const GiveawayModel = Giveaway(guildDb.connection);
    const giveaway = await GiveawayModel.findOne({ messageId });

    if (!giveaway || giveaway.status !== "active") {
      return interaction.reply({ content: "❌ This giveaway is no longer active.", ephemeral: true });
    }

    // ── Blacklist checks ──────────────────────────────
    if (giveaway.blacklistUsers.includes(member.id)) {
      return interaction.reply({ content: "🚫 You are blacklisted from this giveaway.", ephemeral: true });
    }

    if (giveaway.blacklistRoles.some(r => member.roles.cache.has(r))) {
      return interaction.reply({ content: "🚫 You are not eligible to enter this giveaway.", ephemeral: true });
    }

    // ── Role requirements ─────────────────────────────
    for (const roleId of giveaway.requiredRoles) {
      if (!member.roles.cache.has(roleId)) {
        return interaction.reply({
          content: `❌ You need the <@&${roleId}> role to enter this giveaway.`,
          ephemeral: true,
        });
      }
    }

    // ── Toggle entry ──────────────────────────────────
    const hasEntered = giveaway.entries.includes(member.id);

    if (hasEntered) {
      // Remove ALL entries for this user (including bonus)
      await GiveawayModel.findOneAndUpdate(
        { messageId },
        { $pull: { entries: member.id } }
      );

      // Pull removes one occurrence, we need to remove ALL
      await GiveawayModel.updateOne(
        { messageId },
        { $set: { entries: giveaway.entries.filter(e => e !== member.id) } }
      );

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription("❌ You have **left** the giveaway.")
            .setFooter({ text: "Click the button again to re-enter." }),
        ],
        ephemeral: true,
      });
    }

    // ── Calculate entries ──────────────────────────────
    // Base: 1 entry
    let totalEntries = 1;
    const entryList  = [member.id];

    // Bonus entries for roles
    for (const bonus of giveaway.bonusEntries) {
      if (member.roles.cache.has(bonus.roleId)) {
        totalEntries += bonus.entries;
        for (let i = 0; i < bonus.entries; i++) {
          entryList.push(member.id);
        }
      }
    }

    // Add all entries to array
    await GiveawayModel.updateOne(
      { messageId },
      { $push: { entries: { $each: entryList } } }
    );

    const bonusMsg = totalEntries > 1
      ? ` You have **${totalEntries} entries** due to bonus roles!`
      : "";

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setDescription(`🎉 You have **entered** the giveaway for **${giveaway.prize}**!${bonusMsg}`)
          .setFooter({ text: "Click the button again to leave." }),
      ],
      ephemeral: true,
    });
  },
};
