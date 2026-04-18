// ============================================================
//  commands/antinuke/setup.js
//  Auto-setup: creates quarantine role, log channels, statics
// ============================================================
const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { ensureConfig } = require("../../utils/antiNukeUtils");
const { takeBackup }   = require("../../utils/antiNukeBackup");
const e = require("../../emojis/antinukeemoji");

module.exports = {
  name: "setup", description: "Auto-setup the antinuke system.", category: "antinuke",
  aliases: ["ansetup"], usage: "", cooldown: 10, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const member  = message.member;

    // Only server owner, extra owners, or trusted admins
    if (!await canManage(client, guild, message.author.id)) return;

    const setupEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.loading} Setting up Antinuke...`)
      .setDescription("Please wait while I set things up...");

    const msg = await message.reply({ embeds: [setupEmbed] });

    const steps  = [];
    const config = await ensureConfig(client, guild.id);
    const guildDb = await client.db.getGuildDb(guild.id);

    // ── Step 1: Create Quarantine role ────────────────────
    try {
      let quarantineRole = guild.roles.cache.find(r => r.name === "Quarantine");
      if (!quarantineRole) {
        quarantineRole = await guild.roles.create({
          name:        "Quarantine",
          color:       0x2F3136,
          permissions: 0n,
          reason:      "Antinuke setup — Quarantine role",
          position:    1,
        });
        steps.push(`${e.success} Created **Quarantine** role`);
      } else {
        steps.push(`${e.check} Quarantine role already exists`);
      }

      // Set quarantine role perms in all channels
      let chCount = 0;
      for (const [, channel] of guild.channels.cache) {
        if (channel.type === 4) continue;
        await channel.permissionOverwrites.edit(quarantineRole.id, {
          ViewChannel:   false,
          SendMessages:  false,
          AddReactions:  false,
          Connect:       false,
          Speak:         false,
        }).catch(() => {});
        chCount++;
      }

      // Save to config
      const { fromConnection: AntiNukeConfig } = require("../../models/AntiNukeConfig");
      await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id },
        { $set: { quarantineRoleId: quarantineRole.id } }
      );

      steps.push(`${e.success} Set Quarantine perms in **${chCount}** channels`);
    } catch (err) {
      steps.push(`${e.error} Failed to create Quarantine role: ${err.message}`);
    }

    // ── Step 2: Create log channels ───────────────────────
    try {
      let logChannel = guild.channels.cache.find(c => c.name === "an-logs");
      if (!logChannel) {
        logChannel = await guild.channels.create({
          name:   "an-logs",
          reason: "Antinuke setup — log channel",
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });
        steps.push(`${e.success} Created **#an-logs** channel`);
      } else {
        steps.push(`${e.check} #an-logs already exists`);
      }

      let modLogChannel = guild.channels.cache.find(c => c.name === "an-modlogs");
      if (!modLogChannel) {
        modLogChannel = await guild.channels.create({
          name:   "an-modlogs",
          reason: "Antinuke setup — mod log channel",
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          ],
        });
        steps.push(`${e.success} Created **#an-modlogs** channel`);
      } else {
        steps.push(`${e.check} #an-modlogs already exists`);
      }

      // Save channel IDs
      const { fromConnection: AntiNukeConfig } = require("../../models/AntiNukeConfig");
      await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id },
        { $set: { logChannelId: logChannel.id, modLogChannelId: modLogChannel.id, setupCompleted: true, setupAt: new Date() } }
      );

      steps.push(`${e.success} Log channels set in statics`);
    } catch (err) {
      steps.push(`${e.error} Failed to create log channels: ${err.message}`);
    }

    // ── Step 3: Take initial backup ───────────────────────
    try {
      await takeBackup(client, guild, "Setup Backup", message.author.id);
      steps.push(`${e.success} Initial backup taken`);
    } catch {
      steps.push(`${e.warning} Could not take initial backup`);
    }

    // ── Done ──────────────────────────────────────────────
    const doneEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${e.shield} Antinuke Setup Complete!`)
      .setDescription(steps.join("\n"))
      .addFields(
        { name: `${e.info} Next Steps`, value:
          `• Use \`!statics user ?add 10 @user\` to add Trusted Admins\n` +
          `• Use \`!statics user ?add 11 @user\` to add Extra Owners\n` +
          `• Use \`!statics role ?add 5 @role\` to set main roles\n` +
          `• Use \`!whitelist @bot\` to whitelist your other bots\n` +
          `• Use \`!antinuke\` to view and configure filters`
        }
      )
      .setTimestamp();

    await msg.edit({ embeds: [doneEmbed] });
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
