// ============================================================
//  commands/moderation/delwarn.js
//  Delete a specific warning by case number
//  Completely removes from DB to save storage 😂
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/ModCase");

module.exports = {
  name:             "delwarn",
  description:      "Delete a warning by its case number.",
  category:         "moderation",
  aliases:          ["deletewarn", "removewarn", "unwarn"],
  usage:            "<case number> [reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("delwarn")
    .setDescription("Delete a warning by its case number.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(o =>
      o.setName("case")
        .setDescription("The case number of the warning to delete.")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("Reason for deleting the warning.")
        .setRequired(false)
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Timeout Members** permission.")] });
    }

    let caseNumber, reason;
    if (ctx.type === "prefix") {
      caseNumber = parseInt(ctx.args[0]);
      reason     = ctx.args.slice(1).join(" ") || "No reason provided.";
    } else {
      caseNumber = ctx.interaction.options.getInteger("case");
      reason     = ctx.interaction.options.getString("reason") || "No reason provided.";
    }

    if (!caseNumber || caseNumber < 1) {
      return reply(ctx, { embeds: [embeds.error("Please provide a valid case number.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });
    }

    const ModCaseModel = fromConnection(guildDb.connection);

    // Find the case first to verify it's a warn
    const modCase = await ModCaseModel.findOne({ guildId: guild.id, caseNumber });

    if (!modCase) {
      return reply(ctx, { embeds: [embeds.error(`Case **#${caseNumber}** not found in this server.`)] });
    }

    if (modCase.action !== "warn") {
      return reply(ctx, { embeds: [embeds.error(`Case **#${caseNumber}** is not a warning — it's a **${modCase.action}**.\nUse \`case ${caseNumber}\` to view it.`)] });
    }

    // Completely delete from DB
    await ModCaseModel.deleteOne({ guildId: guild.id, caseNumber });

    const modUser = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    return reply(ctx, {
      embeds: [embeds.success(
        `Warning **#${caseNumber}** for **${modCase.targetTag}** has been deleted.\n` +
        `**Reason:** ${reason}\n` +
        `**Deleted by:** ${modUser.tag}`,
        "🗑️ Warning Deleted"
      )],
    });
  },
};
