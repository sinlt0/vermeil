// ============================================================
//  events/guild/modmailInteraction.js
//  Handles modmail button interactions (close/claim/status)
// ============================================================
const { fromConnection: ModmailThread } = require("../../models/ModmailThread");
const { closeThread }                   = require("../../utils/modmailUtils");
const embeds                            = require("../../utils/embeds");
const { EmbedBuilder }                  = require("discord.js");
const { COLORS, PRIORITY_EMOJIS, STATUS_EMOJIS } = require("../../utils/modmailUtils");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.isButton())  return;
    if (!interaction.guild)       return;
    if (!client.db)               return;

    const { customId } = interaction;
    if (!customId.startsWith("mm_")) return;

    const guildDb = await client.db.getGuildDb(interaction.guild.id);
    if (!guildDb || guildDb.isDown) return;

    const ModmailThreadModel = ModmailThread(guildDb.connection);
    const channelId = customId.split("_").slice(2).join("_");

    const thread = await ModmailThreadModel.findOne({ channelId, status: { $ne: "closed" } });
    if (!thread) return interaction.reply({ content: "This thread is no longer active.", ephemeral: true });

    // ── CLOSE ──────────────────────────────────────────
    if (customId.startsWith("mm_close_")) {
      await interaction.deferReply();
      const result = await closeThread(client, interaction.guild, interaction.channel, interaction.user, guildDb, "Closed via button.");
      if (result.error) return interaction.editReply({ content: `❌ ${result.error}` });
      await interaction.editReply({ content: "🔒 Closing thread..." });
    }

    // ── CLAIM ──────────────────────────────────────────
    if (customId.startsWith("mm_claim_")) {
      if (thread.claimedBy === interaction.user.id) {
        await ModmailThreadModel.findOneAndUpdate({ channelId }, { $set: { claimedBy: null } });
        return interaction.reply({ embeds: [embeds.info(`${interaction.user} has **unclaimed** this thread.`, "✋ Unclaimed")] });
      }
      if (thread.claimedBy) {
        return interaction.reply({ content: `❌ Already claimed by <@${thread.claimedBy}>.`, ephemeral: true });
      }
      await ModmailThreadModel.findOneAndUpdate({ channelId }, { $set: { claimedBy: interaction.user.id } });
      return interaction.reply({ embeds: [embeds.success(`${interaction.user} has **claimed** this thread.`, "✋ Claimed")] });
    }

    // ── PENDING ────────────────────────────────────────
    if (customId.startsWith("mm_pending_")) {
      await ModmailThreadModel.findOneAndUpdate({ channelId }, { $set: { status: "pending" } });
      const embed = new EmbedBuilder()
        .setColor(COLORS.pending)
        .setDescription(`${STATUS_EMOJIS.pending} Thread marked as **Pending** by ${interaction.user}.`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    // ── ON HOLD ────────────────────────────────────────
    if (customId.startsWith("mm_onhold_")) {
      await ModmailThreadModel.findOneAndUpdate({ channelId }, { $set: { status: "on-hold" } });
      const embed = new EmbedBuilder()
        .setColor(COLORS.onhold)
        .setDescription(`${STATUS_EMOJIS["on-hold"]} Thread marked as **On Hold** by ${interaction.user}.`)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }
  },
};
