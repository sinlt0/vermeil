// ============================================================
//  commands/antinuke/statics.js  (alias: !s)
//  Manage all statics — roles, channels, users
//
//  !statics                         — view all statics
//  !statics user ?add 10 @user      — add trusted admin
//  !statics user ?remove 10 @user   — remove trusted admin
//  !statics user ?add 11 @user      — add extra owner
//  !statics user ?remove 11 @user   — remove extra owner
//  !statics role ?add 2 @role       — set quarantine role
//  !statics role ?add 5 @role       — add main role
//  !statics role ?remove 5 @role    — remove main role
//  !statics channel ?set 6 #ch      — set log channel
//  !statics channel ?set 7 #ch      — set modlog channel
//  !statics channel ?set 8 #ch      — set partner channel
//  !statics channel ?set 9 #ch      — set main channel
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ensureConfig } = require("../../utils/antiNukeUtils");
const e = require("../../emojis/antinukeemoji");

module.exports = {
  name: "statics", description: "Manage antinuke statics.", category: "antinuke",
  aliases: ["s", "static"], usage: "[user/role/channel] [?add/?remove/?set] [slot] [target]",
  cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb  = await client.db.getGuildDb(guild.id);
    const config   = await ensureConfig(client, guild.id);
    const type     = ctx.args[0]?.toLowerCase();
    const flag     = ctx.args[1]?.toLowerCase();
    const slot     = ctx.args[2];
    const target   = ctx.args[3] ?? ctx.args[2];

    const { fromConnection: AntiNukeConfig }  = require("../../models/AntiNukeConfig");
    const { fromConnection: AntiNukePermit }  = require("../../models/AntiNukePermit");

    // ── VIEW all statics ──────────────────────────────────
    if (!type) {
      const permits = await AntiNukePermit(guildDb.connection).find({ guildId: guild.id }).lean();
      const extraOwners   = permits.filter(p => p.level === "extra_owner");
      const trustedAdmins = permits.filter(p => p.level === "trusted_admin");

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.shield} Antinuke Statics — ${guild.name}`)
        .addFields(
          { name: `${e.extraOwner} [11] Extra Owners`,
            value: extraOwners.length ? extraOwners.map(p => `<@${p.userId}> \`${p.userId}\``).join("\n") : "None", inline: false },
          { name: `${e.trustedAdmin} [10] Trusted Admins`,
            value: trustedAdmins.length ? trustedAdmins.map(p => `<@${p.userId}> \`${p.userId}\``).join("\n") : "None", inline: false },
          { name: `${e.quarantine} [2] Quarantine Role`,
            value: config.quarantineRoleId ? `<@&${config.quarantineRoleId}>` : "Not set", inline: true },
          { name: `${e.mainRole} [5] Main Roles`,
            value: config.mainRoles?.length ? config.mainRoles.map(id => `<@&${id}>`).join(", ") : "None", inline: true },
          { name: `${e.logChannel} [6] Log Channel`,
            value: config.logChannelId ? `<#${config.logChannelId}>` : "Not set", inline: true },
          { name: `${e.modLog} [7] Mod Log Channel`,
            value: config.modLogChannelId ? `<#${config.modLogChannelId}>` : "Not set", inline: true },
          { name: `${e.partnerCh} [8] Partner Channels`,
            value: config.partnerChannelIds?.length ? config.partnerChannelIds.map(id => `<#${id}>`).join(", ") : "None", inline: true },
          { name: `${e.mainChannel} [9] Main Channel`,
            value: config.mainChannelId ? `<#${config.mainChannelId}>` : "Not set", inline: true },
        )
        .setFooter({ text: "!statics user/role/channel ?add/?set <slot> <target>" })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── USER statics ──────────────────────────────────────
    if (type === "user") {
      const slotNum  = slot ?? ctx.args[2];
      const userArg  = message.mentions.users.first() ?? (ctx.args[3] ? { id: ctx.args[3] } : null);

      if (!userArg) return message.reply(`${e.error} Provide a user mention or ID.`);
      if (!["10","11"].includes(slotNum)) return message.reply(`${e.error} Slot must be 10 (Trusted Admin) or 11 (Extra Owner).`);

      const level = slotNum === "11" ? "extra_owner" : "trusted_admin";
      const label = slotNum === "11" ? "Extra Owner" : "Trusted Admin";

      if (flag === "?add") {
        // Only server owner can add extra owners
        if (slotNum === "11" && message.author.id !== guild.ownerId) {
          return message.reply(`${e.error} Only the physical server owner can add Extra Owners.`);
        }
        // Can't add yourself as extra owner
        if (slotNum === "11" && userArg.id === guild.ownerId) {
          return message.reply(`${e.error} You are already the server owner!`);
        }

        const user = await client.users.fetch(userArg.id).catch(() => null);

        await AntiNukePermit(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id, userId: userArg.id },
          { $set: { guildId: guild.id, userId: userArg.id, username: user?.tag, level, addedBy: message.author.id } },
          { upsert: true }
        );

        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Added ${user?.tag ?? userArg.id} as a **${label}**.`)] });
      }

      if (flag === "?remove") {
        if (slotNum === "11" && message.author.id !== guild.ownerId) {
          return message.reply(`${e.error} Only the physical server owner can remove Extra Owners.`);
        }

        const deleted = await AntiNukePermit(guildDb.connection).findOneAndDelete(
          { guildId: guild.id, userId: userArg.id, level }
        );

        if (!deleted) return message.reply(`${e.error} That user is not a ${label}.`);
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Removed \`${userArg.id}\` from **${label}**.`)] });
      }
    }

    // ── ROLE statics ──────────────────────────────────────
    if (type === "role") {
      const roleArg = message.mentions.roles.first() ?? guild.roles.cache.get(ctx.args[3]);
      if (!roleArg) return message.reply(`${e.error} Mention a role or provide a role ID.`);

      if (slot === "2") {
        // Set quarantine role
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id }, { $set: { quarantineRoleId: roleArg.id } }
        );
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Set **${roleArg.name}** as the Quarantine role.`)] });
      }

      if (slot === "5") {
        if (flag === "?add") {
          await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
            { guildId: guild.id }, { $addToSet: { mainRoles: roleArg.id } }
          );
          return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
            .setDescription(`${e.success} Added **${roleArg.name}** to main roles.`)] });
        }
        if (flag === "?remove") {
          await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
            { guildId: guild.id }, { $pull: { mainRoles: roleArg.id } }
          );
          return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
            .setDescription(`${e.success} Removed **${roleArg.name}** from main roles.`)] });
        }
      }

      return message.reply(`${e.error} Slot must be 2 (Quarantine Role) or 5 (Main Role).`);
    }

    // ── CHANNEL statics ───────────────────────────────────
    if (type === "channel") {
      const chArg  = message.mentions.channels.first() ?? guild.channels.cache.get(ctx.args[3]);
      if (!chArg) return message.reply(`${e.error} Mention a channel or provide a channel ID.`);

      const fieldMap = {
        "6": { field: "logChannelId",    label: "Log Channel"    },
        "7": { field: "modLogChannelId", label: "Mod Log Channel"},
        "9": { field: "mainChannelId",   label: "Main Channel"   },
      };

      if (slot === "8") {
        if (flag === "?set" || flag === "?add") {
          await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
            { guildId: guild.id }, { $addToSet: { partnerChannelIds: chArg.id } }
          );
          return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
            .setDescription(`${e.success} Added ${chArg} to partner channels.`)] });
        }
        if (flag === "?remove") {
          await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
            { guildId: guild.id }, { $pull: { partnerChannelIds: chArg.id } }
          );
          return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
            .setDescription(`${e.success} Removed ${chArg} from partner channels.`)] });
        }
      }

      const mapped = fieldMap[slot];
      if (!mapped) return message.reply(`${e.error} Slot must be 6, 7, 8, or 9.`);

      await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id }, { $set: { [mapped.field]: chArg.id } }
      );
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${e.success} Set ${chArg} as the **${mapped.label}**.`)] });
    }

    return message.reply(`${e.error} Usage: \`!statics [user/role/channel] [?add/?remove/?set] [slot] [target]\``);
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
