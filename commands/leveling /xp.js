// ============================================================
//  commands/leveling/xp.js
//  Admin XP management: give, remove, set, reset
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { getLevelFromXP }      = require("../../utils/levelUtils");

module.exports = {
  name:             "xp",
  description:      "Manage XP for a user.",
  category:         "leveling",
  aliases:          [],
  usage:            "<give|remove|set|reset> <@user> [amount]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("xp")
    .setDescription("Manage XP for a user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("give")
      .setDescription("Give XP to a user.")
      .addUserOption(o => o.setName("user").setDescription("Target user.").setRequired(true))
      .addIntegerOption(o => o.setName("amount").setDescription("Amount of XP.").setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove XP from a user.")
      .addUserOption(o => o.setName("user").setDescription("Target user.").setRequired(true))
      .addIntegerOption(o => o.setName("amount").setDescription("Amount of XP.").setRequired(true).setMinValue(1))
    )
    .addSubcommand(sub => sub.setName("set")
      .setDescription("Set a user's XP to a specific amount.")
      .addUserOption(o => o.setName("user").setDescription("Target user.").setRequired(true))
      .addIntegerOption(o => o.setName("amount").setDescription("Amount of XP.").setRequired(true).setMinValue(0))
    )
    .addSubcommand(sub => sub.setName("reset")
      .setDescription("Reset a user's XP.")
      .addUserOption(o => o.setName("user").setDescription("Target user.").setRequired(true))
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

    const LevelSettingsModel = LevelSettings(guildDb.connection);
    const settings = await LevelSettingsModel.findOne({ guildId: guild.id });
    if (!settings?.enabled) return reply(ctx, { embeds: [embeds.error("Leveling is not enabled in this server.")] });

    let sub, targetUser, amount;
    if (ctx.type === "prefix") {
      sub        = ctx.args[0]?.toLowerCase();
      const mention = ctx.message.mentions.users.first();
      targetUser = mention ?? await client.users.fetch(ctx.args[1]).catch(() => null);
      amount     = parseInt(ctx.args[2]);
    } else {
      sub        = ctx.interaction.options.getSubcommand();
      targetUser = ctx.interaction.options.getUser("user");
      amount     = ctx.interaction.options.getInteger("amount");
    }

    if (!targetUser) return reply(ctx, { embeds: [embeds.error("User not found.")] });
    if (targetUser.bot) return reply(ctx, { embeds: [embeds.error("Bots don't have XP.")] });

    const UserLevelModel = UserLevel(guildDb.connection);

    if (sub === "give") {
      if (!amount || amount < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid amount.")] });
      const data = await UserLevelModel.findOneAndUpdate(
        { guildId: guild.id, userId: targetUser.id },
        { $inc: { xp: amount, totalXP: amount }, $setOnInsert: { guildId: guild.id, userId: targetUser.id } },
        { upsert: true, new: true }
      );
      const { level } = getLevelFromXP(data.xp);
      await UserLevelModel.findOneAndUpdate({ guildId: guild.id, userId: targetUser.id }, { $set: { level } });
      return reply(ctx, { embeds: [embeds.success(`Gave **${amount.toLocaleString()} XP** to **${targetUser.tag}**.\nThey are now level **${level}**.`, "✅ XP Given")] });
    }

    if (sub === "remove") {
      if (!amount || amount < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid amount.")] });
      const data = await UserLevelModel.findOneAndUpdate(
        { guildId: guild.id, userId: targetUser.id },
        { $inc: { xp: -amount, totalXP: -amount } },
        { new: true }
      );
      if (!data) return reply(ctx, { embeds: [embeds.error("This user has no XP data.")] });
      const newXP  = Math.max(0, data.xp);
      const { level } = getLevelFromXP(newXP);
      await UserLevelModel.findOneAndUpdate({ guildId: guild.id, userId: targetUser.id }, { $set: { xp: newXP, level } });
      return reply(ctx, { embeds: [embeds.success(`Removed **${amount.toLocaleString()} XP** from **${targetUser.tag}**.\nThey are now level **${level}**.`, "✅ XP Removed")] });
    }

    if (sub === "set") {
      if (amount === undefined || amount < 0) return reply(ctx, { embeds: [embeds.error("Please provide a valid amount.")] });
      const { level } = getLevelFromXP(amount);
      await UserLevelModel.findOneAndUpdate(
        { guildId: guild.id, userId: targetUser.id },
        { $set: { xp: amount, totalXP: amount, level }, $setOnInsert: { guildId: guild.id, userId: targetUser.id } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`Set **${targetUser.tag}**'s XP to **${amount.toLocaleString()}**.\nThey are now level **${level}**.`, "✅ XP Set")] });
    }

    if (sub === "reset") {
      await UserLevelModel.deleteOne({ guildId: guild.id, userId: targetUser.id });
      return reply(ctx, { embeds: [embeds.success(`Reset **${targetUser.tag}**'s XP and level.`, "✅ XP Reset")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `give`, `remove`, `set`, `reset`.")] });
  },
};
