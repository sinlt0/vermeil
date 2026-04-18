// ============================================================
//  events/guild/ticketInteraction.js
//  Handles all ticket-related interactions:
//  - Panel dropdown (category select)
//  - Modal submission (form answers)
//  - Button clicks (close, claim)
// ============================================================
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");

const { fromConnection: TicketCategory } = require("../../models/TicketCategory");
const { fromConnection: TicketPanel }    = require("../../models/TicketPanel");
const { fromConnection: Ticket }         = require("../../models/Ticket");
const { fromConnection: TicketConfig }   = require("../../models/TicketConfig");
const { openTicket, closeTicket }        = require("../../utils/ticketUtils");
const embeds                             = require("../../utils/embeds");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.guild) return;
    if (!client.db)         return;

    const guildDb = await client.db.getGuildDb(interaction.guild.id);
    if (!guildDb || guildDb.isDown) return;

    // ── Panel dropdown — user selects a category ──────
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith("ticket_panel_")) {
      const categoryId = interaction.values[0];

      const TicketCategoryModel = TicketCategory(guildDb.connection);
      const category = await TicketCategoryModel.findById(categoryId);
      if (!category) return interaction.reply({ content: "Category not found.", ephemeral: true });

      // If category has questions show modal
      if (category.questions && category.questions.length > 0) {
        const modal = new ModalBuilder()
          .setCustomId(`ticket_form_${categoryId}`)
          .setTitle(`${category.name} — Ticket Form`);

        for (const q of category.questions.slice(0, 5)) {
          const input = new TextInputBuilder()
            .setCustomId(`q_${q.label.substring(0, 40)}`)
            .setLabel(q.label.substring(0, 45))
            .setStyle(q.style === "paragraph" ? TextInputStyle.Paragraph : TextInputStyle.Short)
            .setRequired(q.required ?? true);

          if (q.placeholder) input.setPlaceholder(q.placeholder.substring(0, 100));
          if (q.minLength)   input.setMinLength(q.minLength);
          if (q.maxLength)   input.setMaxLength(q.maxLength);

          modal.addComponents(new ActionRowBuilder().addComponents(input));
        }

        return interaction.showModal(modal);
      }

      // No questions — open ticket directly
      await interaction.deferReply({ ephemeral: true });
      const result = await openTicket(client, interaction.guild, interaction.member, category, guildDb);

      if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      return interaction.editReply({ content: `✅ Your ticket has been opened! ${result.channel}` });
    }

    // ── Modal submit — form answers ───────────────────
    if (interaction.isModalSubmit() && interaction.customId.startsWith("ticket_form_")) {
      const categoryId = interaction.customId.replace("ticket_form_", "");

      const TicketCategoryModel = TicketCategory(guildDb.connection);
      const category = await TicketCategoryModel.findById(categoryId);
      if (!category) return interaction.reply({ content: "Category not found.", ephemeral: true });

      await interaction.deferReply({ ephemeral: true });

      // Collect form answers
      const formAnswers = {};
      for (const q of category.questions) {
        const key = `q_${q.label.substring(0, 40)}`;
        const answer = interaction.fields.getTextInputValue(key);
        if (answer) formAnswers[q.label] = answer;
      }

      const result = await openTicket(
        client, interaction.guild, interaction.member, category, guildDb, formAnswers
      );

      if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      return interaction.editReply({ content: `✅ Your ticket has been opened! ${result.channel}` });
    }

    // ── Close button ──────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith("ticket_close_")) {
      const channelId = interaction.customId.replace("ticket_close_", "");
      if (channelId !== interaction.channel.id) return;

      await interaction.deferReply();

      const result = await closeTicket(
        client,
        interaction.guild,
        interaction.channel,
        interaction.user,
        guildDb,
        "Closed via button."
      );

      if (result.error) {
        return interaction.editReply({ content: `❌ ${result.error}` });
      }

      await interaction.editReply({ content: "🔒 Ticket is being closed..." });
    }

    // ── Claim button ──────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith("ticket_claim_")) {
      const channelId = interaction.customId.replace("ticket_claim_", "");
      if (channelId !== interaction.channel.id) return;

      const TicketModel = Ticket(guildDb.connection);
      const ticket = await TicketModel.findOne({ channelId: interaction.channel.id, status: "open" });
      if (!ticket) return interaction.reply({ content: "Ticket not found.", ephemeral: true });

      if (ticket.claimedBy) {
        if (ticket.claimedBy === interaction.user.id) {
          // Unclaim
          await TicketModel.findOneAndUpdate(
            { channelId: interaction.channel.id },
            { $set: { claimedBy: null } }
          );
          return interaction.reply({
            embeds: [embeds.info(`${interaction.user} has unclaimed this ticket.`, "✋ Ticket Unclaimed")],
          });
        }
        return interaction.reply({
          content: `❌ This ticket is already claimed by <@${ticket.claimedBy}>.`,
          ephemeral: true,
        });
      }

      await TicketModel.findOneAndUpdate(
        { channelId: interaction.channel.id },
        { $set: { claimedBy: interaction.user.id } }
      );

      return interaction.reply({
        embeds: [embeds.success(`${interaction.user} has claimed this ticket and will assist you shortly.`, "✋ Ticket Claimed")],
      });
    }
  },
};
