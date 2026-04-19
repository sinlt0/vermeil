const { PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require("discord.js");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");

module.exports = {
  name: "interactionCreate",
  once: false,
  async execute(client, interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    if (!interaction.customId.startsWith("vm_")) return;

    const { guild, member, customId } = interaction;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: "❌ You must be in your voice channel to manage it!", ephemeral: true });
    }

    const guildDb = await client.db?.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id });

    if (!data) return interaction.reply({ content: "❌ This is not a VoiceMaster channel.", ephemeral: true });

    // ── Logic: Claim (Only one that doesn't need ownerId match) ──
    if (customId === "vm_claim") {
      if (voiceChannel.members.has(data.ownerId)) {
        return interaction.reply({ content: "❌ The owner is still in the channel!", ephemeral: true });
      }
      data.ownerId = member.id;
      await data.save();
      return interaction.reply({ content: "👑 You are now the owner of this channel!", ephemeral: true });
    }

    // ── All other actions need ownership ──
    if (data.ownerId !== member.id) {
      return interaction.reply({ content: "❌ Only the channel owner can use these controls!", ephemeral: true });
    }

    // ── Handle Buttons ──
    try {
      switch (customId) {
        case "vm_lock":
          await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: false });
          return interaction.reply({ content: "🔒 Channel locked.", ephemeral: true });

        case "vm_unlock":
          await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { Connect: null });
          return interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });

        case "vm_hide":
          await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
          return interaction.reply({ content: "👻 Channel hidden.", ephemeral: true });

        case "vm_unhide":
          await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: null });
          return interaction.reply({ content: "👁️ Channel is now visible.", ephemeral: true });

        case "vm_limit": {
          const modal = new ModalBuilder().setCustomId("vm_modal_limit").setTitle("Set Member Limit");
          const input = new TextInputBuilder().setCustomId("limit").setLabel("User Limit (0-99)").setStyle(TextInputStyle.Short).setPlaceholder("0 = Unlimited").setRequired(true).setMaxLength(2);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }

        case "vm_rename": {
          const modal = new ModalBuilder().setCustomId("vm_modal_rename").setTitle("Rename Channel");
          const input = new TextInputBuilder().setCustomId("name").setLabel("New Channel Name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          return interaction.showModal(modal);
        }
      }
    } catch (err) {
      return interaction.reply({ content: "❌ Action failed. Check bot permissions.", ephemeral: true });
    }

    // ── Handle Modals ──
    if (interaction.isModalSubmit()) {
      if (customId === "vm_modal_limit") {
        const limit = parseInt(interaction.fields.getTextInputValue("limit"));
        if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: "❌ Provide a number between 0 and 99.", ephemeral: true });
        await voiceChannel.setUserLimit(limit);
        return interaction.reply({ content: `✅ Limit set to ${limit || "Unlimited"}.`, ephemeral: true });
      }

      if (customId === "vm_modal_rename") {
        const newName = interaction.fields.getTextInputValue("name");
        await voiceChannel.setName(newName);
        return interaction.reply({ content: `✅ Channel renamed to **${newName}**.`, ephemeral: true });
      }
    }
  },
};
