// ============================================================
//  commands/moderation/case.js
//  Look up a specific mod case by case number
// ============================================================
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/ModCase");
const { ACTION_COLORS, ACTION_EMOJIS, formatDuration } = require("../../utils/modUtils");

module.exports = {
  name:             "case",
  description:      "Look up a specific moderation case.",
  category:         "moderation",
  aliases:          ["modcase"],
  usage:            "<case number>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("case")
    .setDescription("Look up a specific moderation case.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addIntegerOption(o =>
      o.setName("number")
        .setDescription("The case number to look up.")
        .setRequired(true)
        .setMinValue(1)
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Timeout Members** permission.")] });
    }

    const caseNumber = ctx.type === "prefix"
      ? parseInt(ctx.args[0])
      : ctx.interaction.options.getInteger("number");

    if (!caseNumber || caseNumber < 1) {
      return reply(ctx, { embeds: [embeds.error("Please provide a valid case number.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });
    }

    const ModCaseModel = fromConnection(guildDb.connection);
    const modCase = await ModCaseModel.findOne({ guildId: guild.id, caseNumber });

    if (!modCase) {
      return reply(ctx, { embeds: [embeds.error(`Case **#${caseNumber}** not found in this server.`)] });
    }

    const color = ACTION_COLORS[modCase.action] ?? 0x99AAB5;
    const emoji = ACTION_EMOJIS[modCase.action] ?? "📋";

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${emoji} Case #${modCase.caseNumber} — ${capitalise(modCase.action)}`)
      .addFields(
        { name: "👤 Target",     value: `${modCase.targetTag}\n<@${modCase.targetId}>`,        inline: true  },
        { name: "🛡️ Moderator", value: `${modCase.moderatorTag}\n<@${modCase.moderatorId}>`,  inline: true  },
        { name: "📋 Reason",     value: modCase.reason,                                         inline: false },
        ...(modCase.duration
          ? [{ name: "⏱️ Duration", value: formatDuration(modCase.duration), inline: true }]
          : []
        ),
        ...(modCase.expiresAt
          ? [{ name: "📅 Expires", value: `<t:${Math.floor(modCase.expiresAt.getTime() / 1000)}:R>`, inline: true }]
          : []
        ),
        { name: "🕐 Created", value: `<t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`, inline: false },
      )
      .setFooter({ text: `Case #${modCase.caseNumber} • ${guild.name}` })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
