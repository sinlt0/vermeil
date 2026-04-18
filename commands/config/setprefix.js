// ============================================================
//  commands/admin/setprefix.js
//  Change the bot's prefix for this server
//  Requires: ManageGuild permission (Bypassed for Owner/Dev)
//  Requires: Database
// ============================================================
const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { reply }              = require("../../utils/commandRunner");
const embeds                 = require("../../utils/embeds");
const { fromConnection }     = require("../../models/GuildSettings");

const MIN_LENGTH = 1;
const MAX_LENGTH = 5;

module.exports = {
  name:             "setprefix",
  description:      "Change the bot's command prefix for this server.",
  category:         "config",
  aliases:          ["prefix"],
  usage:            "<new prefix>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("setprefix")
    .setDescription("Change the bot's command prefix for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("prefix")
        .setDescription(`The new prefix (${MIN_LENGTH}–${MAX_LENGTH} characters).`)
        .setRequired(true)
        .setMinLength(MIN_LENGTH)
        .setMaxLength(MAX_LENGTH)
    )
    .toJSON(),

  async execute(client, ctx) {
    const member = ctx.type === "prefix"
      ? ctx.message.member
      : ctx.interaction.member;

    const author = ctx.type === "prefix"
      ? ctx.message.author
      : ctx.interaction.user;

    const userId = author.id;

    // ── Owner / Dev Bypass Check ───────────────────────
    const isOwner   = userId === client.config.ownerID;
    const isDev     = Array.isArray(client.config.devIDs) && client.config.devIDs.includes(userId);
    const hasBypass = isOwner || isDev;

    // ── Permission check ───────────────────────────────
    if (!hasBypass && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, {
        embeds: [embeds.error("You need the **Manage Server** permission to use this command.")],
      });
    }

    // ── Resolve new prefix ─────────────────────────────
    const newPrefix = ctx.type === "prefix"
      ? ctx.args[0]
      : ctx.interaction.options.getString("prefix");

    if (!newPrefix) {
      return reply(ctx, {
        embeds: [embeds.error(`Please provide a new prefix.\nUsage: \`${ctx.prefix ?? client.config.prefix}setprefix <new prefix>\``)],
      });
    }

    // ── Validate ───────────────────────────────────────
    if (newPrefix.length < MIN_LENGTH || newPrefix.length > MAX_LENGTH) {
      return reply(ctx, {
        embeds: [embeds.error(`Prefix must be between **${MIN_LENGTH}** and **${MAX_LENGTH}** characters long.`)],
      });
    }

    if (newPrefix.includes("@")) {
      return reply(ctx, {
        embeds: [embeds.error("Prefix cannot contain `@`.")],
      });
    }

    const guildId = ctx.type === "prefix"
      ? ctx.message.guild.id
      : ctx.interaction.guild.id;

    // ── Get the guild's cluster connection ─────────────
    // getGuildDb returns { connection, clusterName, isDown }
    // fromConnection() binds the schema to that specific connection
    const guildDb = await client.db.getGuildDb(guildId);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, {
        embeds: [embeds.clusterDown(guildDb?.clusterName)],
      });
    }

    const GuildSettings = fromConnection(guildDb.connection);

    const oldSettings = await GuildSettings.findOne({ guildId });
    const oldPrefix   = oldSettings?.prefix ?? client.config.prefix;

    await GuildSettings.findOneAndUpdate(
      { guildId },
      { guildId, prefix: newPrefix },
      { upsert: true, new: true }
    );

    // ── Success embed ──────────────────────────────────
    const successEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("✅ Prefix Updated")
      .setDescription("The server prefix has been successfully changed.")
      .addFields(
        { name: "Old Prefix", value: `\`${oldPrefix}\``, inline: true },
        { name: "New Prefix", value: `\`${newPrefix}\``, inline: true },
      )
      .setFooter({
        text:    `Changed by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [successEmbed] });
  },
};
