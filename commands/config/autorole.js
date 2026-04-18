// ============================================================
//  commands/autorole/autorole.js
//  Manage autoroles for humans and bots
//  Subcommands: add, remove, list
//  Usage:
//    autorole add human @role
//    autorole add bot @role
//    autorole remove human @role
//    autorole remove bot @role
//    autorole list
// ============================================================
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/AutoRole");

const MAX_ROLES = 10; // max roles per type

module.exports = {
  name:             "autorole",
  description:      "Manage automatic roles given to members and bots on join.",
  category:         "config",
  aliases:          ["ar"],
  usage:            "<add|remove|list> <human|bot> [@role]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Manage automatic roles given to members and bots on join.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add an autorole.")
      .addStringOption(o => o.setName("type")
        .setDescription("Human or bot autorole.")
        .setRequired(true)
        .addChoices(
          { name: "Human", value: "human" },
          { name: "Bot",   value: "bot"   }
        )
      )
      .addRoleOption(o => o.setName("role").setDescription("The role to add.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove an autorole.")
      .addStringOption(o => o.setName("type")
        .setDescription("Human or bot autorole.")
        .setRequired(true)
        .addChoices(
          { name: "Human", value: "human" },
          { name: "Bot",   value: "bot"   }
        )
      )
      .addRoleOption(o => o.setName("role").setDescription("The role to remove.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("list")
      .setDescription("List all configured autoroles.")
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Roles** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });
    }

    const AutoRoleModel = fromConnection(guildDb.connection);

    let sub, type, roleId;

    if (ctx.type === "prefix") {
      sub    = ctx.args[0]?.toLowerCase();
      type   = ctx.args[1]?.toLowerCase();
      roleId = ctx.message.mentions.roles.first()?.id ?? ctx.args[2];
    } else {
      sub    = ctx.interaction.options.getSubcommand();
      type   = ctx.interaction.options.getString("type");
      roleId = ctx.interaction.options.getRole("role")?.id;
    }

    // ── LIST ───────────────────────────────────────────
    if (sub === "list") {
      const config = await AutoRoleModel.findOne({ guildId: guild.id });

      const humanRoles = config?.humanRoles ?? [];
      const botRoles   = config?.botRoles   ?? [];

      const humanList = humanRoles.length
        ? humanRoles.map(id => `<@&${id}>`).join("\n")
        : "*(none set)*";

      const botList = botRoles.length
        ? botRoles.map(id => `<@&${id}>`).join("\n")
        : "*(none set)*";

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("⚙️ Autorole Configuration")
        .addFields(
          { name: `👤 Human Autoroles [${humanRoles.length}/${MAX_ROLES}]`, value: humanList, inline: false },
          { name: `🤖 Bot Autoroles [${botRoles.length}/${MAX_ROLES}]`,     value: botList,   inline: false },
        )
        .setFooter({ text: `${guild.name} • Roles are assigned on member join` })
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    }

    // ── Validate type ──────────────────────────────────
    if (!["human", "bot"].includes(type)) {
      return reply(ctx, { embeds: [embeds.error("Type must be `human` or `bot`.")] });
    }

    if (!roleId) {
      return reply(ctx, { embeds: [embeds.error("Please provide a valid role.")] });
    }

    // Validate role exists and is assignable
    const role = guild.roles.cache.get(roleId);
    if (!role) return reply(ctx, { embeds: [embeds.error("Role not found.")] });
    if (role.managed) return reply(ctx, { embeds: [embeds.error("That role is managed by an integration and cannot be used as an autorole.")] });
    if (role.position >= guild.members.me.roles.highest.position) {
      return reply(ctx, { embeds: [embeds.error("That role is higher than or equal to my highest role. Please move my role above it.")] });
    }

    const field = type === "human" ? "humanRoles" : "botRoles";

    // ── ADD ────────────────────────────────────────────
    if (sub === "add") {
      const config = await AutoRoleModel.findOne({ guildId: guild.id });
      const current = config?.[field] ?? [];

      if (current.includes(roleId)) {
        return reply(ctx, { embeds: [embeds.error(`${role} is already an autorole for **${type}s**.\``)] });
      }

      if (current.length >= MAX_ROLES) {
        return reply(ctx, { embeds: [embeds.error(`You can only have up to **${MAX_ROLES}** autoroles per type.`)] });
      }

      await AutoRoleModel.findOneAndUpdate(
        { guildId: guild.id },
        { $push: { [field]: roleId }, $setOnInsert: { guildId: guild.id } },
        { upsert: true }
      );

      return reply(ctx, {
        embeds: [embeds.success(
          `${role} will now be assigned to all **${type}s** when they join.`,
        `<:emoji_41:1492047757404274779> Autorole Added`
        )],
      });
    }

    // ── REMOVE ─────────────────────────────────────────
    if (sub === "remove") {
      const config = await AutoRoleModel.findOne({ guildId: guild.id });
      const current = config?.[field] ?? [];

      if (!current.includes(roleId)) {
        return reply(ctx, { embeds: [embeds.error(`${role} is not an autorole for **${type}s**.`)] });
      }

      await AutoRoleModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { [field]: roleId } }
      );

      return reply(ctx, {
        embeds: [embeds.success(
          `${role} has been removed from **${type}** autoroles.`,         `<:emoji_44:1492047831400317019> Autorole Removed`
        )],
      });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`.")] });
  },
};
