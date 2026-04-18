// ============================================================
//  commands/leveling/rolerewards.js
//  Manage role rewards given at certain levels
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");

module.exports = {
  name:             "rolerewards",
  description:      "Manage role rewards for reaching certain levels.",
  category:         "leveling",
  aliases:          ["levelroles", "rr"],
  usage:            "<add|remove|list> [level] [@role]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("rolerewards")
    .setDescription("Manage role rewards for reaching certain levels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add a role reward.")
      .addIntegerOption(o => o.setName("level").setDescription("Level required.").setRequired(true).setMinValue(1))
      .addRoleOption(o => o.setName("role").setDescription("Role to assign.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a role reward.")
      .addIntegerOption(o => o.setName("level").setDescription("Level to remove reward from.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("list").setDescription("List all role rewards."))
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

    let sub, level, roleId;
    if (ctx.type === "prefix") {
      sub    = ctx.args[0]?.toLowerCase();
      level  = parseInt(ctx.args[1]);
      roleId = ctx.message.mentions.roles.first()?.id ?? ctx.args[2];
    } else {
      sub    = ctx.interaction.options.getSubcommand();
      level  = ctx.interaction.options.getInteger("level");
      roleId = ctx.interaction.options.getRole("role")?.id;
    }

    // LIST
    if (sub === "list") {
      const rewards = [...(settings.roleRewards ?? [])].sort((a, b) => a.level - b.level);
      if (rewards.length === 0) return reply(ctx, { embeds: [embeds.info("No role rewards configured.")] });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎖️ Role Rewards")
        .setDescription(rewards.map(r => `Level **${r.level}** → <@&${r.roleId}>`).join("\n"))
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    if (!level || level < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid level.")] });

    // ADD
    if (sub === "add") {
      if (!roleId) return reply(ctx, { embeds: [embeds.error("Please provide a role.")] });

      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { roleRewards: { level } } }
      );
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $push: { roleRewards: { level, roleId } } }
      );
      return reply(ctx, { embeds: [embeds.success(`At level **${level}**: <@&${roleId}> will be assigned.`, "🎖️ Role Reward Added")] });
    }

    // REMOVE
    if (sub === "remove") {
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { roleRewards: { level } } }
      );
      return reply(ctx, { embeds: [embeds.success(`Role reward for level **${level}** removed.`, "🎖️ Role Reward Removed")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`.")] });
  },
};
