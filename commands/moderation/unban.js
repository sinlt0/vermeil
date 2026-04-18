// ============================================================
//  commands/moderation/unban.js
//  Unban by user ID or tag
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }    = require("../../utils/commandRunner");
const embeds       = require("../../utils/embeds");
const { createCase, sendModLog } = require("../../utils/modUtils");
const { fromConnection: TempBan } = require("../../models/TempBan");

module.exports = {
  name:             "unban",
  description:      "Unban a user by their ID.",
  category:         "moderation",
  aliases:          [],
  usage:            "<userID> [reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unban a user by their ID.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName("userid").setDescription("The user ID to unban.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the unban.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.BanMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Ban Members** permission.")] });
    }

    let userId, reason;
    if (ctx.type === "prefix") {
      userId = ctx.args[0];
      reason = ctx.args.slice(1).join(" ") || "No reason provided.";
    } else {
      userId = ctx.interaction.options.getString("userid");
      reason = ctx.interaction.options.getString("reason") || "No reason provided.";
    }

    if (!userId || !/^\d{17,19}$/.test(userId)) {
      return reply(ctx, { embeds: [embeds.error("Please provide a valid user ID.")] });
    }

    // Check if user is actually banned
    const banEntry = await guild.bans.fetch(userId).catch(() => null);
    if (!banEntry) {
      return reply(ctx, { embeds: [embeds.error("This user is not banned.")] });
    }

    await guild.members.unban(userId, reason);

    // Remove from tempban DB if exists
    const guildDb = await client.db.getGuildDb(guild.id);
    if (guildDb && !guildDb.isDown) {
      const TempBanModel = TempBan(guildDb.connection);
      await TempBanModel.deleteOne({ guildId: guild.id, userId }).catch(() => {});
    }

    const modCase = await createCase(client, guild.id, {
      action:       "unban",
      targetId:     userId,
      targetTag:    banEntry.user.tag,
      moderatorId:  mod.id,
      moderatorTag: mod.user.tag,
      reason,
    });

    await sendModLog(client, guild, modCase);

    return reply(ctx, {
      embeds: [embeds.success(
        `**${banEntry.user.tag}** has been unbanned.\n**Reason:** ${reason}\n**Case:** #${modCase?.caseNumber ?? "N/A"}`,
        "✅ User Unbanned"
      )],
    });
  },
};
