// ============================================================
//  commands/ticket/ticketform.js
//  Configure form questions per ticket category
//  Subcommands: add, remove, list, clear
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/TicketCategory");

module.exports = {
  name:             "ticketform",
  description:      "Configure form questions for a ticket category.",
  category:         "ticket",
  aliases:          ["tform"],
  usage:            "<add|remove|list|clear> <category> [options]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("ticketform")
    .setDescription("Configure form questions for a ticket category.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add a question to a category form.")
      .addStringOption(o => o.setName("category").setDescription("Category name.").setRequired(true))
      .addStringOption(o => o.setName("label").setDescription("Question label.").setRequired(true).setMaxLength(45))
      .addStringOption(o => o.setName("style").setDescription("Input style.").setRequired(false)
        .addChoices({ name: "Short", value: "short" }, { name: "Paragraph", value: "paragraph" }))
      .addStringOption(o => o.setName("placeholder").setDescription("Placeholder text.").setRequired(false).setMaxLength(100))
      .addBooleanOption(o => o.setName("required").setDescription("Is this question required?").setRequired(false))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a question from a category form.")
      .addStringOption(o => o.setName("category").setDescription("Category name.").setRequired(true))
      .addIntegerOption(o => o.setName("number").setDescription("Question number (from list).").setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub => sub.setName("list")
      .setDescription("List questions for a category.")
      .addStringOption(o => o.setName("category").setDescription("Category name.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("clear")
      .setDescription("Clear all questions from a category.")
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

    let sub, categoryName;
    if (ctx.type === "prefix") {
      sub          = ctx.args[0]?.toLowerCase();
      categoryName = ctx.args[1];
    } else {
      sub          = ctx.interaction.options.getSubcommand();
      categoryName = ctx.interaction.options.getString("category");
    }

    const category = await TicketCategoryModel.findOne({ guildId: guild.id, name: { $regex: new RegExp(`^${categoryName}$`, "i") } });
    if (!category) return reply(ctx, { embeds: [embeds.error(`Category **${categoryName}** not found.`)] });

    // ADD
    if (sub === "add") {
      if (category.questions.length >= 5) {
        return reply(ctx, { embeds: [embeds.error("Maximum of **5** questions per category (Discord modal limit).")] });
      }

      let label, style, placeholder, required;
      if (ctx.type === "prefix") {
        label       = ctx.args[2];
        style       = "short";
        placeholder = null;
        required    = true;
      } else {
        label       = ctx.interaction.options.getString("label");
        style       = ctx.interaction.options.getString("style") ?? "short";
        placeholder = ctx.interaction.options.getString("placeholder");
        required    = ctx.interaction.options.getBoolean("required") ?? true;
      }

      if (!label) return reply(ctx, { embeds: [embeds.error("Please provide a question label.")] });

      await TicketCategoryModel.findByIdAndUpdate(
        category._id,
        { $push: { questions: { label, style, placeholder, required } } }
      );

      return reply(ctx, { embeds: [embeds.success(`Question added to **${category.name}**:\n**"${label}"**\nStyle: ${style} | Required: ${required ? "Yes" : "No"}`, "✅ Question Added")] });
    }

    // REMOVE
    if (sub === "remove") {
      const num = ctx.type === "prefix" ? parseInt(ctx.args[2]) : ctx.interaction.options.getInteger("number");
      if (!num || num < 1 || num > category.questions.length) {
        return reply(ctx, { embeds: [embeds.error(`Invalid question number. This category has **${category.questions.length}** question(s).`)] });
      }

      const questions = [...category.questions];
      questions.splice(num - 1, 1);

      await TicketCategoryModel.findByIdAndUpdate(category._id, { $set: { questions } });
      return reply(ctx, { embeds: [embeds.success(`Question #${num} removed from **${category.name}**.`, "✅ Question Removed")] });
    }

    // LIST
    if (sub === "list") {
      if (category.questions.length === 0) {
        return reply(ctx, { embeds: [embeds.info(`**${category.name}** has no form questions. Users can open tickets directly.`)] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`📋 Form Questions — ${category.name}`)
        .setDescription(category.questions.map((q, i) =>
          `**${i + 1}.** ${q.label}\n┣ Style: ${q.style} | Required: ${q.required ? "Yes" : "No"}\n┗ Placeholder: ${q.placeholder ?? "*(none)*"}`
        ).join("\n\n"))
        .setFooter({ text: `${category.questions.length}/5 questions` })
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    }

    // CLEAR
    if (sub === "clear") {
      await TicketCategoryModel.findByIdAndUpdate(category._id, { $set: { questions: [] } });
      return reply(ctx, { embeds: [embeds.success(`All questions cleared from **${category.name}**.`, "✅ Form Cleared")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`, `clear`.")] });
  },
};
