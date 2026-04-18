// ============================================================
//  events/client/modmailDM.js
//  Handles incoming DMs from users
//
//  Flow:
//  1. Find all guilds where modmail is enabled AND user is a member
//  2. If 0 guilds → ignore
//  3. If 1 guild → check for open thread or prompt to open
//  4. If multiple guilds → show server selection dropdown first
//  5. After server selected → route to open thread or relay
// ============================================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require("discord.js");
const { fromConnection: ModmailConfig }  = require("../../models/ModmailConfig");
const { fromConnection: ModmailThread }  = require("../../models/ModmailThread");
const { openThread, relayToThread }      = require("../../utils/modmailUtils");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (message.guild)      return;
    if (!client.db)         return;

    const user = message.author;

    // ── Step 1: Find all eligible guilds ─────────────────
    // Eligible = modmail enabled + user is a member
    const eligibleGuilds = [];

    for (const [, guild] of client.guilds.cache) {
      try {
        const guildDb = await client.db.getGuildDb(guild.id);
        if (!guildDb || guildDb.isDown) continue;

        const ModmailConfigModel = ModmailConfig(guildDb.connection);
        const config = await ModmailConfigModel.findOne({ guildId: guild.id, enabled: true });
        if (!config) continue;

        // Check user is in this guild
        const member = await guild.members.fetch(user.id).catch(() => null);
        if (!member) continue;

        eligibleGuilds.push({ guild, guildDb, config });
      } catch {}
    }

    if (eligibleGuilds.length === 0) return;

    // ── Step 2: Single guild — no server select needed ───
    if (eligibleGuilds.length === 1) {
      await handleGuild(client, user, message, eligibleGuilds[0]);
      return;
    }

    // ── Step 3: Multiple guilds — show server selector ───
    const selectEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("📬 Contact Support")
      .setDescription(
        "You are a member of **multiple servers** that have modmail enabled.\n\n" +
        "Please select which server you'd like to contact support for."
      )
      .setFooter({ text: "This selection will expire in 30 seconds." })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("mm_server_select")
      .setPlaceholder("🏠 Select a server...")
      .addOptions(
        eligibleGuilds.map(({ guild }) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(guild.name)
            .setDescription(`Contact support in ${guild.name}`)
            .setValue(guild.id)
            .setEmoji("📬")
        )
      );

    const row = new ActionRowBuilder().addComponents(menu);

    const prompt = await user.send({ embeds: [selectEmbed], components: [row] }).catch(() => null);
    if (!prompt) return;

    // Wait for server selection
    const filter = (i) => i.user.id === user.id && i.customId === "mm_server_select";
    const interaction = await prompt.awaitMessageComponent({ filter, time: 30_000 }).catch(() => null);

    if (!interaction) {
      await prompt.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x99AAB5)
            .setTitle("⏱️ Timed Out")
            .setDescription("Server selection expired. Please DM again to try again.")
            .setTimestamp(),
        ],
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();
    await prompt.edit({ components: [] });

    const selectedGuildId = interaction.values[0];
    const selected = eligibleGuilds.find(({ guild }) => guild.id === selectedGuildId);
    if (!selected) return;

    await handleGuild(client, user, message, selected);
  },
};

// ============================================================
//  Handle a single guild — relay or prompt to open
// ============================================================
async function handleGuild(client, user, message, { guild, guildDb, config }) {
  try {
    const ModmailThreadModel = ModmailThread(guildDb.connection);

    // Check for existing open thread in this guild
    const existing = await ModmailThreadModel.findOne({
      guildId: guild.id,
      userId:  user.id,
      status:  { $ne: "closed" },
    });

    if (existing) {
      // Relay message to existing thread
      const channel = guild.channels.cache.get(existing.channelId);
      if (!channel) return;
      await relayToThread(client, channel, user, message, guildDb);
      return;
    }

    // No open thread — prompt to open one
    const promptEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📬 Contact Support — ${guild.name}`)
      .setDescription(
        `Your message has been received.\n\n` +
        `Would you like to open a **modmail thread** with **${guild.name}**?\n\n` +
        `A support team member will respond as soon as possible.`
      )
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setFooter({ text: `${guild.name} • Expires in 30 seconds` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mm_open_${guild.id}`)
        .setLabel(`Open Thread in ${guild.name}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📬"),
      new ButtonBuilder()
        .setCustomId(`mm_cancel_${guild.id}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌"),
    );

    const prompt = await user.send({ embeds: [promptEmbed], components: [row] }).catch(() => null);
    if (!prompt) return;

    const filter = (i) =>
      i.user.id === user.id &&
      (i.customId === `mm_open_${guild.id}` || i.customId === `mm_cancel_${guild.id}`);

    const interaction = await prompt.awaitMessageComponent({ filter, time: 30_000 }).catch(() => null);

    if (!interaction || interaction.customId === `mm_cancel_${guild.id}`) {
      await prompt.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(0x99AAB5)
            .setTitle("❌ Cancelled")
            .setDescription("Thread opening cancelled.")
            .setTimestamp(),
        ],
        components: [],
      });
      return;
    }

    await interaction.deferUpdate();
    await prompt.edit({ components: [] });

    const result = await openThread(client, user, guild, guildDb, message);

    if (result.error) {
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle("❌ Could not open thread")
            .setDescription(result.error)
            .setTimestamp(),
        ],
      }).catch(() => {});
    }
  } catch (err) {
    console.error("[modmailDM] Error:", err.message);
  }
}
