// ============================================================
//  commands/ticket/ticketcategory.js
//  Manage ticket categories
//  Subcommands: add, remove, edit, list
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/TicketCategory");

module.exports = {
  name:             "ticketcategory",
  description:      "Manage ticket categories.",
  category:         "ticket",
  aliases:          ["tcategory", "tcat"],
  usage:            "<add|remove|edit|list> [options]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("ticketcategory")
    .setDescription("Manage ticket categories.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add a new ticket category.")
      .addStringOption(o => o.setName("name").setDescription("Category name.").setRequired(true).setMaxLength(50))
      .addStringOption(o => o.setName("description").setDescription("Category description shown in panel.").setRequired(false).setMaxLength(100))
      .addStringOption(o => o.setName("emoji").setDescription("Category emoji.").setRequired(false))
      .addStringOption(o => o.setName("naming").setDescription("Naming pattern e.g. ticket-{number} or support-{username}.").setRequired(false))
      .addStringOption(o => o.setName("color").setDescription("Embed color hex e.g. #FF5733.").setRequired(false))
      .addChannelOption(o => o.setName("category").setDescription("Discord channel category for tickets.").addChannelTypes(ChannelType.GuildCategory).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a ticket category.")
      .addStringOption(o => o.setName("name").setDescription("Category name to remove.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("list").setDescription("List all ticket categories."))
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

    let sub;
    if (ctx.type === "prefix") {
      sub = ctx.args[0]?.toLowerCase();
    } else {
      sub = ctx.interaction.options.getSubcommand();
    }

    // ADD
    if (sub === "add") {
      let name, description, emoji, naming, color, categoryId;
      if (ctx.type === "prefix") {
        name        = ctx.args[1];
        description = ctx.args.slice(2).join(" ") || null;
        emoji       = "🎫";
        naming      = "ticket-{number}";
        color       = "#5865F2";
        categoryId  = null;
      } else {
        name        = ctx.interaction.options.getString("name");
        description = ctx.interaction.options.getString("description");
        emoji       = ctx.interaction.options.getString("emoji") ?? "🎫";
        naming      = ctx.interaction.options.getString("naming") ?? "ticket-{number}";
        color       = ctx.interaction.options.getString("color") ?? "#5865F2";
        categoryId  = ctx.interaction.options.getChannel("category")?.id ?? null;
      }

      if (!name) return reply(ctx, { embeds: [embeds.error("Please provide a category name.")] });

      const existing = await TicketCategoryModel.findOne({ guildId: guild.id, name: { $regex: new RegExp(`^${name}$`, "i") } });
      if (existing) return reply(ctx, { embeds: [embeds.error(`A category named **${name}** already exists.`)] });

      const count = await TicketCategoryModel.countDocuments({ guildId: guild.id });
      if (count >= 25) return reply(ctx, { embeds: [embeds.error("You can have a maximum of **25** categories.")] });

      await TicketCategoryModel.create({
        guildId: guild.id,
        name,
        description,
        emoji,
        namingPattern:   naming,
        color:           color.startsWith("#") ? color : `#${color}`,
        channelCategory: categoryId,
      });

      return reply(ctx, { embeds: [embeds.success(`Category **${emoji} ${name}** has been created.\nUse \`ticketform\` to add questions and \`ticketrole\` to add support roles.`, "✅ Category Created")] });
    }

    // REMOVE
    if (sub === "remove") {
      const name = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("name");
      if (!name) return reply(ctx, { embeds: [embeds.error("Please provide a category name.")] });

      const category = await TicketCategoryModel.findOne({ guildId: guild.id, name: { $regex: new RegExp(`^${name}$`, "i") } });
      if (!category) return reply(ctx, { embeds: [embeds.error(`Category **${name}** not found.`)] });

      await TicketCategoryModel.deleteOne({ _id: category._id });
      return reply(ctx, { embeds: [embeds.success(`Category **${category.emoji} ${category.name}** has been removed.`, "✅ Category Removed")] });
    }

    // LIST
    if (sub === "list") {
      const categories = await TicketCategoryModel.find({ guildId: guild.id });
      if (categories.length === 0) return reply(ctx, { embeds: [embeds.info("No categories configured. Use `ticketcategory add` to create one.")] });

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle("🎫 Ticket Categories")
        .setDescription(categories.map(c =>
          `**${c.emoji} ${c.name}**\n` +
          `┣ Description: ${c.description ?? "*(none)*"}\n` +
          `┣ Naming: \`${c.namingPattern}\`\n` +
          `┣ Support Roles: ${c.supportRoles.length > 0 ? c.supportRoles.map(r => `<@&${r}>`).join(", ") : "*(none)*"}\n` +
          `┣ Questions: ${c.questions.length}\n` +
          `┗ Total Tickets: ${c.ticketCount}`
        ).join("\n\n"))
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`.")] });
  },
};
