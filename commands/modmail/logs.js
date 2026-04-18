// ============================================================
//  commands/modmail/logs.js
//  View past modmail threads for a user
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply }                          = require("../../utils/commandRunner");
const embeds                             = require("../../utils/embeds");
const { fromConnection: ModmailThread }  = require("../../models/ModmailThread");
const { PRIORITY_EMOJIS, STATUS_EMOJIS } = require("../../utils/modmailUtils");

module.exports = {
  name:             "modmaillogs",
  description:      "View past modmail threads for a user.",
  category:         "modmail",
  aliases:          ["mmhistory", "mmthreads"],
  usage:            "<@user|id>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("mmlogs")
    .setDescription("View past modmail threads for a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to check.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!member.permissions.has("ManageMessages")) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Messages** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    let targetUser;
    if (ctx.type === "prefix") {
      targetUser = ctx.message.mentions.users.first()
        || await client.users.fetch(ctx.args[0]).catch(() => null);
    } else {
      targetUser = ctx.interaction.options.getUser("user");
    }

    if (!targetUser) return reply(ctx, { embeds: [embeds.error("User not found.")] });

    const ModmailThreadModel = ModmailThread(guildDb.connection);
    const threads = await ModmailThreadModel
      .find({ guildId: guild.id, userId: targetUser.id })
      .sort({ createdAt: -1 })
      .limit(10);

    if (threads.length === 0) {
      return reply(ctx, { embeds: [embeds.info(`**${targetUser.tag}** has no modmail history.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
      .setTitle(`📬 Modmail History — ${targetUser.tag}`)
      .setDescription(threads.map(t =>
        `${STATUS_EMOJIS[t.status]} **#${String(t.threadNumber).padStart(4, "0")}** ${PRIORITY_EMOJIS[t.priority]}\n` +
        `┣ Status: ${t.status} | Messages: ${t.messageCount}\n` +
        `┗ Opened: <t:${Math.floor(t.createdAt.getTime() / 1000)}:R>`
      ).join("\n\n"))
      .setFooter({ text: `${threads.length} thread(s) shown (max 10)` })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};
