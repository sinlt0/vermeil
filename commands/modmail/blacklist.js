// ============================================================
//  commands/modmail/blacklist.js
//  Blacklist/unblacklist users from modmail
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }                          = require("../../utils/commandRunner");
const embeds                             = require("../../utils/embeds");
const { fromConnection: ModmailConfig }  = require("../../models/ModmailConfig");

module.exports = {
  name:             "mmblacklist",
  description:      "Blacklist or unblacklist a user from modmail.",
  category:         "modmail",
  aliases:          ["mmblacklist"],
  usage:            "<add|remove> <@user|id>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("mmblacklist")
    .setDescription("Blacklist or unblacklist a user from modmail.")
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Blacklist a user.")
      .addUserOption(o => o.setName("user").setDescription("User to blacklist.").setRequired(true))
      .addStringOption(o => o.setName("reason").setDescription("Reason.").setRequired(false))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a user from the blacklist.")
      .addUserOption(o => o.setName("user").setDescription("User to unblacklist.").setRequired(true))
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!member.permissions.has("ManageMessages")) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Messages** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ModmailConfigModel = ModmailConfig(guildDb.connection);

    let sub, targetUser, reason;
    if (ctx.type === "prefix") {
      sub        = ctx.args[0]?.toLowerCase();
      targetUser = ctx.message.mentions.users.first()
        || await client.users.fetch(ctx.args[1]).catch(() => null);
      reason     = ctx.args.slice(2).join(" ") || "No reason provided.";
    } else {
      sub        = ctx.interaction.options.getSubcommand();
      targetUser = ctx.interaction.options.getUser("user");
      reason     = ctx.interaction.options.getString("reason") || "No reason provided.";
    }

    if (!targetUser) return reply(ctx, { embeds: [embeds.error("User not found.")] });

    if (sub === "add") {
      await ModmailConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $addToSet: { blacklist: targetUser.id } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`**${targetUser.tag}** has been blacklisted from modmail.\n**Reason:** ${reason}`, "🚫 Blacklisted")] });
    }

    if (sub === "remove") {
      await ModmailConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { blacklist: targetUser.id } }
      );
      return reply(ctx, { embeds: [embeds.success(`**${targetUser.tag}** has been removed from the modmail blacklist.`, "✅ Unblacklisted")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add` or `remove`.")] });
  },
};
