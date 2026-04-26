// ============================================================
//  commands/leveling/multiplier.js
//  Manage role and user XP multipliers
//  Subcommands: add, remove, list
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");

module.exports = {
  name:             "multiplier",
  description:      "Manage XP multipliers for roles and users.",
  category:         "leveling",
  aliases:          ["multi", "xpmulti"],
  usage:            "<add|remove|list> [role|user] [@target] [multiplier]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("multiplier")
    .setDescription("Manage XP multipliers for roles and users.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add a multiplier.")
      .addStringOption(o => o.setName("type").setDescription("Role or user multiplier.").setRequired(true)
        .addChoices({ name: "Role", value: "role" }, { name: "User", value: "user" }))
      .addMentionableOption(o => o.setName("target").setDescription("The role or user.").setRequired(true))
      .addNumberOption(o => o.setName("multiplier").setDescription("Multiplier value e.g. 2 for 2x.").setRequired(true).setMinValue(0.1).setMaxValue(10))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a multiplier.")
      .addStringOption(o => o.setName("type").setDescription("Role or user multiplier.").setRequired(true)
        .addChoices({ name: "Role", value: "role" }, { name: "User", value: "user" }))
      .addMentionableOption(o => o.setName("target").setDescription("The role or user.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("list").setDescription("List all multipliers."))
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

    let sub, type, targetId, multiplierValue;

    if (ctx.type === "prefix") {
      sub             = ctx.args[0]?.toLowerCase();
      type            = ctx.args[1]?.toLowerCase();
      const mention   = ctx.message.mentions.roles.first() ?? ctx.message.mentions.users.first();
      targetId        = mention?.id ?? ctx.args[2];
      multiplierValue = parseFloat(ctx.args[3]);
    } else {
      sub             = ctx.interaction.options.getSubcommand();
      type            = ctx.interaction.options.getString("type");
      const target    = ctx.interaction.options.getMentionable("target");
      targetId        = target?.id;
      multiplierValue = ctx.interaction.options.getNumber("multiplier");
    }

    // LIST
    if (sub === "list") {
      const mults = settings.multipliers ?? [];
      if (mults.length === 0) return reply(ctx, { embeds: [embeds.info("No multipliers configured.")] });

      const roleLines = mults.filter(m => m.type === "role")
        .map(m => `<@&${m.targetId}> → **${m.multiplier}x**`);
      const userLines = mults.filter(m => m.type === "user")
        .map(m => `<@${m.targetId}> → **${m.multiplier}x**`);

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle("⚡ XP Multipliers")
        .addFields(
          { name: "Role Multipliers", value: roleLines.join("\n") || "None", inline: false },
          { name: "User Multipliers", value: userLines.join("\n") || "None", inline: false },
          { name: "Stacking",         value: settings.stackMultipliers ? "✅ Enabled" : "❌ Disabled", inline: true },
        )
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    if (!["role", "user"].includes(type)) {
      return reply(ctx, { embeds: [embeds.error("Type must be `role` or `user`.")] });
    }
    if (!targetId) return reply(ctx, { embeds: [embeds.error("Please provide a valid target.")] });

    // ADD
    if (sub === "add") {
      if (!multiplierValue || multiplierValue < 0.1) return reply(ctx, { embeds: [embeds.error("Please provide a valid multiplier (min 0.1).")] });

      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { multipliers: { type, targetId } } }
      );
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $push: { multipliers: { type, targetId, multiplier: multiplierValue } } }
      );

      const mention = type === "role" ? `<@&${targetId}>` : `<@${targetId}>`;
      return reply(ctx, { embeds: [embeds.success(`Set **${multiplierValue}x** XP multiplier for ${mention}.`, "⚡ Multiplier Added")] });
    }

    // REMOVE
    if (sub === "remove") {
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { multipliers: { type, targetId } } }
      );
      const mention = type === "role" ? `<@&${targetId}>` : `<@${targetId}>`;
      return reply(ctx, { embeds: [embeds.success(`Removed multiplier for ${mention}.`, "⚡ Multiplier Removed")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`.")] });
  },
};
