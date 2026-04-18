// ============================================================
//  events/guild/verificationInteraction.js
// ============================================================
const {
  EmbedBuilder, ModalBuilder, TextInputBuilder,
  TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require("discord.js");
const { fromConnection: VerificationConfig } = require("../../models/VerificationConfig");
const { fromConnection: AutoRole }           = require("../../models/AutoRole");
const {
  generateCaptcha, buildCaptchaAttachment,
  generateVerifyCard, storeCaptcha, getCaptcha, deleteCaptcha,
} = require("../../utils/verifyUtils");
const emoji = require("../../emojis/verifyemoji");

module.exports = {
  name: "interactionCreate",
  once: false,

  async execute(client, interaction) {
    if (!interaction.guild) return;
    if (!client.db)         return;

    const guildDb = await client.db.getGuildDb(interaction.guild.id);
    if (!guildDb || guildDb.isDown) return;

    const VerifyModel = VerificationConfig(guildDb.connection);
    const config      = await VerifyModel.findOne({ guildId: interaction.guild.id });
    if (!config?.enabled) return;

    // ── Verify button clicked ─────────────────────────
    if (interaction.isButton() && interaction.customId === "verify_start") {
      const member = interaction.member;

      // Already verified
      if (config.verifiedRoleId && member.roles.cache.has(config.verifiedRoleId)) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x8b5cf6).setDescription(`${emoji.verified} You are already verified!`)],
          ephemeral: true,
        });
      }

      // ── One-click ─────────────────────────────────
      if (config.type === "oneclick") {
        await verifyMember(client, interaction.guild, member, config, guildDb);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x57F287)
            .setTitle(`${emoji.verified} Verified!`)
            .setDescription("You have been successfully verified and now have access to the server.")
            .setTimestamp()],
          ephemeral: true,
        });
      }

      // ── Captcha — generate PNG and show ───────────
      if (config.type === "captcha") {
        // Defer while we generate the image
        await interaction.deferReply({ ephemeral: true });

        const captcha    = await generateCaptcha(); // now returns { text, buffer }
        const attachment = buildCaptchaAttachment(captcha.buffer); // PNG attachment

        storeCaptcha(member.id, interaction.guild.id, captcha.text, config.retryLimit);

        const captchaData  = getCaptcha(member.id, interaction.guild.id);
        const attemptsLeft = config.retryLimit - (captchaData?.attempts ?? 0);

        const embed = new EmbedBuilder()
          .setColor(0x8b5cf6)
          .setTitle(`${emoji.captcha} Complete the Captcha`)
          .setDescription(
            `Solve the captcha image below to verify yourself.\n\n` +
            `Click **Enter Answer** and type the **6 characters** you see.\n\n` +
            `${emoji.clock} Expires in **5 minutes** • ${emoji.retry} **${attemptsLeft}** attempt${attemptsLeft !== 1 ? "s" : ""} remaining`
          )
          .setImage("attachment://captcha.png") // PNG — renders correctly in Discord
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("verify_enter_captcha")
            .setLabel("Enter Answer")
            .setStyle(ButtonStyle.Primary)
            .setEmoji(emoji.key),
        );

        return interaction.editReply({
          embeds:     [embed],
          files:      [attachment],
          components: [row],
        });
      }
    }

    // ── Enter captcha button → show modal ─────────────
    if (interaction.isButton() && interaction.customId === "verify_enter_captcha") {
      const captchaData = getCaptcha(interaction.user.id, interaction.guild.id);

      if (!captchaData) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245)
            .setDescription(`${emoji.error} Your captcha has **expired**. Click Verify again to get a new one.`)],
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("verify_modal_submit")
        .setTitle("Verify yourself");

      const input = new TextInputBuilder()
        .setCustomId("captcha_answer")
        .setLabel("ANSWER")
        .setPlaceholder("Enter the 6 characters shown in the image")
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(6)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

    // ── Modal submitted ───────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === "verify_modal_submit") {
      const answer      = interaction.fields.getTextInputValue("captcha_answer").toUpperCase().trim();
      const captchaData = getCaptcha(interaction.user.id, interaction.guild.id);

      if (!captchaData) {
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245)
            .setDescription(`${emoji.error} Your captcha has **expired**. Click Verify again.`)],
          ephemeral: true,
        });
      }

      captchaData.attempts++;

      // ── Correct ────────────────────────────────────
      if (answer === captchaData.text.toUpperCase()) {
        deleteCaptcha(interaction.user.id, interaction.guild.id);
        await verifyMember(client, interaction.guild, interaction.member, config, guildDb);
        return interaction.reply({
          embeds: [new EmbedBuilder().setColor(0x57F287)
            .setTitle(`${emoji.verified} Verified!`)
            .setDescription("You have been successfully verified and now have access to the server.")
            .setTimestamp()],
          ephemeral: true,
        });
      }

      // ── Wrong ──────────────────────────────────────
      const attemptsLeft = captchaData.retryLimit - captchaData.attempts;

      if (attemptsLeft <= 0) {
        deleteCaptcha(interaction.user.id, interaction.guild.id);

        await interaction.reply({
          embeds: [new EmbedBuilder().setColor(0xED4245)
            .setTitle(`${emoji.kick} Verification Failed`)
            .setDescription("You exceeded the maximum number of attempts and have been kicked.")
            .setTimestamp()],
          ephemeral: true,
        });

        await interaction.user.send({
          embeds: [new EmbedBuilder().setColor(0xED4245)
            .setTitle(`${emoji.kick} Kicked from ${interaction.guild.name}`)
            .setDescription("You were kicked for failing verification too many times. You may rejoin and try again.")
            .setTimestamp()],
        }).catch(() => {});

        await interaction.member.kick("Failed verification — exceeded retry limit").catch(() => {});
        return;
      }

      // ── Retry — generate fresh PNG captcha ─────────
      await interaction.deferReply({ ephemeral: true });

      const newCaptcha    = await generateCaptcha();
      const newAttachment = buildCaptchaAttachment(newCaptcha.buffer);

      // Update stored captcha text but preserve attempt count
      const prevAttempts = captchaData.attempts;
      storeCaptcha(interaction.user.id, interaction.guild.id, newCaptcha.text, captchaData.retryLimit);
      const updated      = getCaptcha(interaction.user.id, interaction.guild.id);
      updated.attempts   = prevAttempts;

      const retryEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`${emoji.error} Wrong Answer`)
        .setDescription(
          `That answer was incorrect. Here is a new captcha.\n\n` +
          `${emoji.retry} **${attemptsLeft}** attempt${attemptsLeft !== 1 ? "s" : ""} remaining\n` +
          `${emoji.clock} Expires in **5 minutes**\n\n` +
          `Click **Enter Answer** to try again.`
        )
        .setImage("attachment://captcha.png")
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("verify_enter_captcha")
          .setLabel("Enter Answer")
          .setStyle(ButtonStyle.Primary)
          .setEmoji(emoji.key),
      );

      return interaction.editReply({
        embeds:     [retryEmbed],
        files:      [newAttachment],
        components: [row],
      });
    }
  },
};

// ============================================================
//  Verify member — give verified role, remove unverified,
//  give human autoroles, DM user
// ============================================================
async function verifyMember(client, guild, member, config, guildDb) {
  try {
    if (config.verifiedRoleId) {
      const role = guild.roles.cache.get(config.verifiedRoleId);
      if (role) await member.roles.add(role).catch(() => {});
    }
    if (config.unverifiedRoleId) {
      const role = guild.roles.cache.get(config.unverifiedRoleId);
      if (role) await member.roles.remove(role).catch(() => {});
    }

    // Give human autoroles
    const AutoRoleModel = AutoRole(guildDb.connection);
    const autoConfig    = await AutoRoleModel.findOne({ guildId: guild.id });
    if (autoConfig?.humanRoles?.length) {
      for (const roleId of autoConfig.humanRoles) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;
        if (role.position >= guild.members.me.roles.highest.position) continue;
        await member.roles.add(role).catch(() => {});
      }
    }

    // DM user
    await member.user.send({
      embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle(`${emoji.verified} Successfully Verified`)
        .setDescription(`You have been verified in **${guild.name}** and now have full access!`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setTimestamp()],
    }).catch(() => {});
  } catch (err) {
    console.error("[Verification] verifyMember error:", err.message);
  }
}
