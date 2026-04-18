// ============================================================
//  commands/leveling/rank.js
//  Shows rank card for a user
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { generateRankCard, getLevelFromXP } = require("../../utils/levelUtils");

module.exports = {
  name:             "rank",
  description:      "View your or another user's rank card.",
  category:         "leveling",
  aliases:          ["level", "lvl"],
  usage:            "[@user|id|username]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("View your or another user's rank card.")
    .addUserOption(o => o.setName("user").setDescription("The user to check.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const LevelSettingsModel = LevelSettings(guildDb.connection);
    const settings = await LevelSettingsModel.findOne({ guildId: guild.id });
    if (!settings?.enabled) return reply(ctx, { embeds: [embeds.error("Leveling is not enabled in this server.")] });

    // Resolve target
    let member;
    if (ctx.type === "prefix") {
      const mention = ctx.message.mentions.members.first();
      if (mention) {
        member = mention;
      } else if (ctx.args[0]) {
        // Try ID or username
        member = guild.members.cache.get(ctx.args[0])
          ?? guild.members.cache.find(m =>
              m.user.username.toLowerCase() === ctx.args[0].toLowerCase() ||
              m.displayName.toLowerCase() === ctx.args[0].toLowerCase()
            );
      } else {
        member = ctx.message.member;
      }
    } else {
      const targetUser = ctx.interaction.options.getUser("user");
      member = targetUser
        ? await guild.members.fetch(targetUser.id).catch(() => null)
        : ctx.interaction.member;
    }

    if (!member) return reply(ctx, { embeds: [embeds.error("Member not found.")] });

    const UserLevelModel = UserLevel(guildDb.connection);
    let data = await UserLevelModel.findOne({ guildId: guild.id, userId: member.id });
    if (!data) {
      data = { xp: 0, level: 0, totalXP: 0, weeklyXP: 0, xpBarColor: null };
    }

    // Get rank position
    const rank = await UserLevelModel.countDocuments({
      guildId: guild.id,
      xp: { $gt: data.xp },
    }) + 1;

    const card = await generateRankCard(member, data, rank, settings).catch(() => null);

    if (card) {
      return reply(ctx, { files: [card] });
    }

    // Fallback embed if card fails
    const { currentXP, neededXP } = getLevelFromXP(data.xp);
    return reply(ctx, {
      embeds: [
        embeds.info(
          `**Rank:** #${rank}\n**Level:** ${data.level}\n**XP:** ${currentXP}/${neededXP}\n**Total XP:** ${data.totalXP}`,
          `📊 ${member.user.displayName}'s Rank`
        ),
      ],
    });
  },
};
