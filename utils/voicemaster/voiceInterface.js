const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const e = require("../../emojis/voicemasteremoji");

/**
 * Builds the premium control panel embed and buttons
 */
function buildInterface(guild) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: `${guild.name} | Voice Interface`, iconURL: guild.iconURL() })
    .setTitle(`${e.voice} Voice Management Panel`)
    .setDescription(
      "Click the buttons below to manage your temporary voice channel.\n" +
      "Only the **Channel Owner** can use these controls!\n\n" +
      "**Privacy Controls:**\n" +
      `${e.lock} / ${e.unlock} — Lock or Unlock access.\n` +
      `${e.hide} / ${e.unhide} — Show or Hide your room.\n\n` +
      "**Customization:**\n" +
      `${e.limit} — Set a member limit.\n` +
      `${e.rename} — Change your channel name.\n\n` +
      "**Ownership:**\n" +
      `${e.claim} — Take control if owner leaves.\n` +
      `${e.transfer} — Transfer ownership to someone else.`
    )
    .setImage(guild.bannerURL({ size: 1024 }) || null)
    .setFooter({ text: "Powered by Vermeil VoiceMaster" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vm_lock").setLabel("Lock").setStyle(ButtonStyle.Secondary).setEmoji(e.lock),
    new ButtonBuilder().setCustomId("vm_unlock").setLabel("Unlock").setStyle(ButtonStyle.Secondary).setEmoji(e.unlock),
    new ButtonBuilder().setCustomId("vm_hide").setLabel("Hide").setStyle(ButtonStyle.Secondary).setEmoji(e.hide),
    new ButtonBuilder().setCustomId("vm_unhide").setLabel("Unhide").setStyle(ButtonStyle.Secondary).setEmoji(e.unhide)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("vm_limit").setLabel("Limit").setStyle(ButtonStyle.Primary).setEmoji(e.limit),
    new ButtonBuilder().setCustomId("vm_rename").setLabel("Rename").setStyle(ButtonStyle.Primary).setEmoji(e.rename),
    new ButtonBuilder().setCustomId("vm_transfer").setLabel("Transfer").setStyle(ButtonStyle.Secondary).setEmoji(e.transfer),
    new ButtonBuilder().setCustomId("vm_claim").setLabel("Claim").setStyle(ButtonStyle.Success).setEmoji(e.claim)
  );

  return { embeds: [embed], components: [row1, row2] };
}

module.exports = { buildInterface };
