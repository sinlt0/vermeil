// ============================================================
//  commands/antinuke/backup.js
//  !backup              — take instant backup
//  !backup list         — list all backups (paginated)
//  !backup load <id>    — restore a backup
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { takeBackup, restoreBackup } = require("../../utils/antiNukeBackup");
const e = require("../../emojis/antinukeemoji");

module.exports = {
  name: "backup", 
    description: "Manage server backups.", 
    category: "antinuke",
  aliases: ["bkp"], 
   usage: "[list|load <id>]", 
    cooldown: 5, 
    slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: AntiNukeBackup } = require("../../models/AntiNukeBackup");
    const BackupModel = AntiNukeBackup(guildDb.connection);

    const sub = ctx.args[0]?.toLowerCase();

    // ── LIST ──────────────────────────────────────────────
    if (sub === "list") {
      const backups = await BackupModel.find({ guildId: guild.id }).sort({ createdAt: -1 }).lean();
      if (!backups.length) return message.reply(`${e.error} No backups found. Use \`!backup\` to take one.`);

      const lines = backups.map((b, i) =>
        `\`${i + 1}.\` **${b.label}**\n` +
        `┣ ID: \`${b._id}\`\n` +
        `┣ ${b.channelCount} channels · ${b.roleCount} roles\n` +
        `┗ <t:${Math.floor(new Date(b.createdAt).getTime() / 1000)}:R> ${b.automated ? "*(auto)*" : "*(manual)*"}`
      );

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e.backup} Backups — ${guild.name}`)
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: `${backups.length}/10 backups stored` })
        .setTimestamp()] });
    }

    // ── LOAD/RESTORE ──────────────────────────────────────
    if (sub === "load") {
      const backupId = ctx.args[1];
      if (!backupId) return message.reply(`${e.error} Provide a backup ID. Use \`!backup list\` to see IDs.`);

      // Confirm prompt
      const confirmEmbed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`${e.warning} Confirm Restore`)
        .setDescription(
          `Are you sure you want to restore backup \`${backupId}\`?\n\n` +
          `This will restore channel permissions and role permissions to the backup state.\n` +
          `**This cannot be undone!**`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("backup_confirm").setLabel("Restore").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("backup_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      );

      const msg = await message.reply({ embeds: [confirmEmbed], components: [row] });

      const filter = i => i.user.id === message.author.id && ["backup_confirm","backup_cancel"].includes(i.customId);
      const interaction = await msg.awaitMessageComponent({ filter, time: 30_000 }).catch(() => null);

      if (!interaction || interaction.customId === "backup_cancel") {
        return msg.edit({ embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription(`${e.error} Restore cancelled.`)], components: [] });
      }

      await interaction.deferUpdate();

      const loadingEmbed = new EmbedBuilder().setColor(0x5865F2).setDescription(`${e.loading} Restoring backup...`);
      await msg.edit({ embeds: [loadingEmbed], components: [] });

      const result = await restoreBackup(client, guild, backupId, message.author.id);
      if (!result.success) return msg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${e.error} ${result.reason}`)] });

      return msg.edit({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setTitle(`${e.restore} Backup Restored!`)
        .setDescription(`Restored **${result.restoredChannels}** channel permissions and **${result.restoredRoles}** role permissions.`)
        .setTimestamp()] });
    }

    // ── TAKE BACKUP ───────────────────────────────────────
    const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`${e.loading} Taking backup...`)] });

    const backup = await takeBackup(client, guild, "Manual Backup", message.author.id);
    if (!backup) return msg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`${e.error} Failed to take backup.`)] });

    return msg.edit({ embeds: [new EmbedBuilder().setColor(0x57F287)
      .setTitle(`${e.backup} Backup Taken!`)
      .addFields(
        { name: "Label",    value: backup.label,                     inline: true },
        { name: "Channels", value: `${backup.channelCount}`,         inline: true },
        { name: "Roles",    value: `${backup.roleCount}`,            inline: true },
        { name: "ID",       value: `\`${backup._id}\``,             inline: false },
      )
      .setTimestamp()] });
  },
};

async function canManage(client, guild, userId) {
  if (guild.ownerId === userId) return true;
  if (userId === client.config.ownerID) return true;
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb) return false;
  const { fromConnection: AntiNukePermit } = require("../../models/AntiNukePermit");
  const permit = await AntiNukePermit(guildDb.connection).findOne({ guildId: guild.id, userId }).lean();
  return !!permit;
}
