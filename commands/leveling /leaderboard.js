// ============================================================
//  commands/leveling/leaderboard.js
//  Paginated server leaderboard (all-time + weekly)
// ============================================================
const {
  SlashCommandBuilder, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { getLevelFromXP }      = require("../../utils/levelUtils");

const PAGE_SIZE = 10;

module.exports = {
  name:             "leaderboard",
  description:      "View the server XP leaderboard.",
  category:         "leveling",
  aliases:          ["lb", "top"],
  usage:            "[weekly]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the server XP leaderboard.")
    .addSubcommand(sub => sub.setName("alltime").setDescription("All-time leaderboard."))
    .addSubcommand(sub => sub.setName("weekly").setDescription("Weekly leaderboard."))
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const LevelSettingsModel = LevelSettings(guildDb.connection);
    const settings = await LevelSettingsModel.findOne({ guildId: guild.id });
    if (!settings?.enabled) return reply(ctx, { embeds: [embeds.error("Leveling is not enabled in this server.")] });

    // Determine weekly or alltime
    const isWeekly = ctx.type === "prefix"
      ? ctx.args[0]?.toLowerCase() === "weekly"
      : ctx.interaction.options.getSubcommand() === "weekly";

    const sortField = isWeekly ? "weeklyXP" : "xp";
    const UserLevelModel = UserLevel(guildDb.connection);

    const total = await UserLevelModel.countDocuments({ guildId: guild.id, [sortField]: { $gt: 0 } });
    if (total === 0) return reply(ctx, { embeds: [embeds.info("No XP data yet for this server.")] });

    const totalPages = Math.ceil(total / PAGE_SIZE);
    let page = 0;

    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const buildEmbed = async (p) => {
      const entries = await UserLevelModel
        .find({ guildId: guild.id, [sortField]: { $gt: 0 } })
        .sort({ [sortField]: -1 })
        .skip(p * PAGE_SIZE)
        .limit(PAGE_SIZE);

      const medals = ["🥇", "🥈", "🥉"];
      const lines  = [];

      for (let i = 0; i < entries.length; i++) {
        const globalRank = p * PAGE_SIZE + i + 1;
        const entry      = entries[i];
        const { currentXP, neededXP } = getLevelFromXP(entry.xp);
        const medal = globalRank <= 3 ? medals[globalRank - 1] : `\`#${globalRank}\``;

        let username = `<@${entry.userId}>`;
        try {
          const m = await guild.members.fetch(entry.userId).catch(() => null);
          if (m) username = m.user.displayName;
        } catch {}

        lines.push(
          `${medal} **${username}** — Level \`${entry.level}\` • ${isWeekly ? entry.weeklyXP.toLocaleString() : entry.xp.toLocaleString()} XP`
        );
      }

      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${isWeekly ? "📅 Weekly" : "🏆 All-Time"} Leaderboard — ${guild.name}`)
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .setDescription(lines.join("\n") || "No entries.")
        .setFooter({
          text:    `Page ${p + 1}/${totalPages} • ${total} members ranked`,
          iconURL: author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();
    };

    const buildRow = (p) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("lb_prev")
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p === 0),
      new ButtonBuilder()
        .setCustomId("lb_next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(p >= totalPages - 1),
    );

    const msg = await reply(ctx, {
      embeds:     [await buildEmbed(page)],
      components: totalPages > 1 ? [buildRow(page)] : [],
    });

    if (totalPages <= 1) return;

    const sentMsg = ctx.type === "prefix"
      ? msg
      : await ctx.interaction.fetchReply();

    const collector = sentMsg.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id !== author.id) {
          i.reply({ content: "❌ This isn't your leaderboard!", ephemeral: true });
          return false;
        }
        return ["lb_prev", "lb_next"].includes(i.customId);
      },
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "lb_prev" && page > 0) page--;
      if (i.customId === "lb_next" && page < totalPages - 1) page++;
      await i.update({ embeds: [await buildEmbed(page)], components: [buildRow(page)] });
    });

    collector.on("end", () => sentMsg.edit({ components: [] }).catch(() => {}));
  },
};
