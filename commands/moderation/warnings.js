// ============================================================
//  commands/moderation/warnings.js
//  Shows paginated list of warnings for a user in this server
// ============================================================
const {
  SlashCommandBuilder, PermissionFlagsBits,
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require("discord.js");
const { reply }    = require("../../utils/commandRunner");
const embeds       = require("../../utils/embeds");
const { fromConnection: ModCase } = require("../../models/ModCase");

const PAGE_SIZE = 5;

module.exports = {
  name:             "warnings",
  description:      "View all warnings for a user in this server.",
  category:         "moderation",
  aliases:          ["warns"],
  usage:            "<@user|id>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View all warnings for a user in this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName("user").setDescription("The user to check.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Timeout Members** permission.")] });
    }

    let targetUser;
    if (ctx.type === "prefix") {
      targetUser = ctx.message.mentions.users.first()
        || await client.users.fetch(ctx.args[0]).catch(() => null);
    } else {
      targetUser = ctx.interaction.options.getUser("user");
    }

    if (!targetUser) return reply(ctx, { embeds: [embeds.error("User not found.")] });

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });
    }

    const ModCaseModel = ModCase(guildDb.connection);
    const warns = await ModCaseModel.find({
      guildId:  guild.id,
      targetId: targetUser.id,
      action:   "warn",
    }).sort({ createdAt: -1 });

    if (warns.length === 0) {
      return reply(ctx, {
        embeds: [embeds.info(`**${targetUser.tag}** has no warnings in this server.`)],
      });
    }

    let page = 0;
    const totalPages = Math.ceil(warns.length / PAGE_SIZE);

    const buildEmbed = (p) => {
      const slice = warns.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
      const embed = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle(`⚠️ Warnings — ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(`**Total Warnings:** \`${warns.length}\`\n\u200b`)
        .setFooter({ text: `Page ${p + 1} of ${totalPages}` })
        .setTimestamp();

      for (const w of slice) {
        embed.addFields({
          name:  `Case #${w.caseNumber} — ${new Date(w.createdAt).toLocaleDateString()}`,
          value: `**Reason:** ${w.reason}\n**Moderator:** <@${w.moderatorId}>`,
          inline: false,
        });
      }

      return embed;
    };

    const buildRow = (p) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("warn_prev")
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p === 0),
      new ButtonBuilder()
        .setCustomId("warn_next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p >= totalPages - 1),
    );

    const msg = await reply(ctx, {
      embeds: [buildEmbed(page)],
      components: totalPages > 1 ? [buildRow(page)] : [],
    });

    if (totalPages <= 1) return;

    // Fetch the actual message object for the collector
    const sentMsg = ctx.type === "prefix"
      ? msg
      : await ctx.interaction.fetchReply();

    const collector = sentMsg.createMessageComponentCollector({
      filter: (i) => {
        const userId = ctx.type === "prefix" ? ctx.message.author.id : ctx.interaction.user.id;
        return i.user.id === userId && ["warn_prev", "warn_next"].includes(i.customId);
      },
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "warn_prev" && page > 0) page--;
      if (i.customId === "warn_next" && page < totalPages - 1) page++;
      await i.update({ embeds: [buildEmbed(page)], components: [buildRow(page)] });
    });

    collector.on("end", async () => {
      await sentMsg.edit({ components: [] }).catch(() => {});
    });
  },
};
