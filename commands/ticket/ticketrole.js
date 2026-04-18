// ============================================================
//  commands/ticket/ticketrole.js
//  Manage support team roles per category
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/TicketCategory");

module.exports = {
  name:             "ticketrole",
  description:      "Manage support team roles for a ticket category.",
  category:         "ticket",
  aliases:          ["trole", "supportrole"],
  usage:            "<add|remove|list> <category> [@role]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("ticketrole")
    .setDescription("Manage support team roles for a ticket category.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add a support role to a category.")
      .addStringOption(o => o.setName("category").setDescription("Category name.").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Support role.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a support role from a category.")
      .addStringOption(o => o.setName("category").setDescription("Category name.").setRequired(true))
      .addRoleOption(o => o.setName("role").setDescription("Role to remove.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("list")
      .setDescription("List support roles for a category.")
      .addStringOption(o => o.setName("category").setDescription("Category name.").setRequired(true))
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const TicketCategoryModel = fromConnection(guildDb.connection);

    let sub, categoryName, roleId;
    if (ctx.type === "prefix") {
      sub          = ctx.args[0]?.toLowerCase();
      categoryName = ctx.args[1];
      roleId       = ctx.message.mentions.roles.first()?.id ?? ctx.args[2];
    } else {
      sub          = ctx.interaction.options.getSubcommand();
      categoryName = ctx.interaction.options.getString("category");
      roleId       = ctx.interaction.options.getRole("role")?.id;
    }

    const category = await TicketCategoryModel.findOne({ guildId: guild.id, name: { $regex: new RegExp(`^${categoryName}$`, "i") } });
    if (!category) return reply(ctx, { embeds: [embeds.error(`Category **${categoryName}** not found.`)] });

    if (sub === "add") {
      if (!roleId) return reply(ctx, { embeds: [embeds.error("Please provide a role.")] });
      if (category.supportRoles.includes(roleId)) return reply(ctx, { embeds: [embeds.error("That role is already a support role for this category.")] });

      await TicketCategoryModel.findByIdAndUpdate(category._id, { $push: { supportRoles: roleId } });
      return reply(ctx, { embeds: [embeds.success(`<@&${roleId}> added as support role for **${category.name}**.`, "✅ Role Added")] });
    }

    if (sub === "remove") {
      if (!roleId) return reply(ctx, { embeds: [embeds.error("Please provide a role.")] });
      await TicketCategoryModel.findByIdAndUpdate(category._id, { $pull: { supportRoles: roleId } });
      return reply(ctx, { embeds: [embeds.success(`<@&${roleId}> removed from **${category.name}** support roles.`, "✅ Role Removed")] });
    }

    if (sub === "list") {
      const roles = category.supportRoles;
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle(`🛡️ Support Roles — ${category.name}`)
            .setDescription(roles.length > 0 ? roles.map(r => `<@&${r}>`).join("\n") : "No support roles configured.")
            .setTimestamp(),
        ],
      });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`.")] });
  },
};
