// ============================================================
//  commands/leveling/leveling.js
//  Master leveling system toggle and configuration
//  Subcommands: enable, disable, reset, config
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");
const { fromConnection: UserLevel }     = require("../../models/UserLevel");

module.exports = {
  name:             "leveling",
  description:      "Manage the leveling system settings.",
  category:         "leveling",
  aliases:          ["levelingsystem", "xpsystem"],
  usage:            "<enable|disable|reset|config> [options]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("leveling")
    .setDescription("Manage the leveling system settings.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("enable").setDescription("Enable the leveling system."))
    .addSubcommand(sub => sub.setName("disable").setDescription("Disable the leveling system."))
    .addSubcommand(sub => sub.setName("reset")
      .setDescription("Reset all XP data for the server.")
    )
    .addSubcommand(sub => sub.setName("config")
      .setDescription("Configure XP rates, cooldown and voice settings.")
      .addIntegerOption(o => o.setName("minxp").setDescription("Minimum XP per message.").setMinValue(1).setMaxValue(1000))
      .addIntegerOption(o => o.setName("maxxp").setDescription("Maximum XP per message.").setMinValue(1).setMaxValue(1000))
      .addIntegerOption(o => o.setName("cooldown").setDescription("Cooldown between XP gains in seconds.").setMinValue(1).setMaxValue(3600))
      .addBooleanOption(o => o.setName("voice").setDescription("Enable/disable voice XP."))
      .addIntegerOption(o => o.setName("voicexp").setDescription("XP gained per voice interval.").setMinValue(1).setMaxValue(1000))
      .addIntegerOption(o => o.setName("voiceinterval").setDescription("Voice XP interval in seconds.").setMinValue(10).setMaxValue(3600))
      .addBooleanOption(o => o.setName("afkleveling").setDescription("Allow XP gain in AFK channel."))
      .addIntegerOption(o => o.setName("minmembers").setDescription("Minimum members in voice channel for XP.").setMinValue(1).setMaxValue(100))
      .addBooleanOption(o => o.setName("stackmultipliers").setDescription("Stack multipliers together."))
      .addStringOption(o => o.setName("timezone").setDescription("Timezone for weekly reset e.g. Asia/Dhaka, America/New_York."))
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

    let sub;
    if (ctx.type === "prefix") {
      sub = ctx.args[0]?.toLowerCase();
    } else {
      sub = ctx.interaction.options.getSubcommand();
    }

    // ENABLE
    if (sub === "enable") {
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { enabled: true }, $setOnInsert: { guildId: guild.id } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success("Leveling system has been **enabled**! Members will now earn XP for chatting.", "✅ Leveling Enabled")] });
    }

    // DISABLE
    if (sub === "disable") {
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { enabled: false } }
      );
      return reply(ctx, { embeds: [embeds.success("Leveling system has been **disabled**. XP data is preserved.", "❌ Leveling Disabled")] });
    }

    // RESET
    if (sub === "reset") {
      const UserLevelModel = UserLevel(guildDb.connection);
      const count = await UserLevelModel.countDocuments({ guildId: guild.id });
      await UserLevelModel.deleteMany({ guildId: guild.id });
      return reply(ctx, { embeds: [embeds.success(`Reset XP data for **${count}** members.`, "🔄 XP Reset")] });
    }

    // CONFIG
    if (sub === "config") {
      const settings = await LevelSettingsModel.findOne({ guildId: guild.id });

      if (ctx.type === "prefix") {
        // Show current config for prefix
        const s = settings ?? {};
        const configEmbed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle("⚙️ Leveling Configuration")
          .addFields(
            { name: "Status",          value: s.enabled ? "✅ Enabled" : "❌ Disabled", inline: true },
            { name: "Min XP",          value: `\`${s.minXP ?? 15}\``,                  inline: true },
            { name: "Max XP",          value: `\`${s.maxXP ?? 25}\``,                  inline: true },
            { name: "Cooldown",        value: `\`${s.cooldown ?? 60}s\``,              inline: true },
            { name: "Voice XP",        value: s.voiceEnabled ? "✅" : "❌",            inline: true },
            { name: "Voice XP/min",    value: `\`${s.voiceXP ?? 10}\``,               inline: true },
            { name: "Voice Interval",  value: `\`${s.voiceInterval ?? 60}s\``,         inline: true },
            { name: "AFK Leveling",    value: s.voiceAFKEnabled ? "✅" : "❌",         inline: true },
            { name: "Min Voice Members",value: `\`${s.voiceMinMembers ?? 1}\``,        inline: true },
            { name: "Stack Multipliers",value: s.stackMultipliers ? "✅" : "❌",       inline: true },
            { name: "Timezone",        value: `\`${s.timezone ?? "UTC"}\``,            inline: true },
            { name: "Level Up Channel",value: s.levelUpChannel ? `<#${s.levelUpChannel}>` : "Same channel", inline: true },
            { name: "Level Up DM",     value: s.levelUpDM ? "✅" : "❌",              inline: true },
          )
          .setTimestamp();
        return reply(ctx, { embeds: [configEmbed] });
      }

      // Slash — apply options
      const updates = {};
      const opts    = ctx.interaction.options;

      if (opts.getInteger("minxp")        !== null) updates.minXP           = opts.getInteger("minxp");
      if (opts.getInteger("maxxp")        !== null) updates.maxXP           = opts.getInteger("maxxp");
      if (opts.getInteger("cooldown")     !== null) updates.cooldown        = opts.getInteger("cooldown");
      if (opts.getBoolean("voice")        !== null) updates.voiceEnabled    = opts.getBoolean("voice");
      if (opts.getInteger("voicexp")      !== null) updates.voiceXP         = opts.getInteger("voicexp");
      if (opts.getInteger("voiceinterval")!== null) updates.voiceInterval   = opts.getInteger("voiceinterval");
      if (opts.getBoolean("afkleveling")  !== null) updates.voiceAFKEnabled = opts.getBoolean("afkleveling");
      if (opts.getInteger("minmembers")   !== null) updates.voiceMinMembers = opts.getInteger("minmembers");
      if (opts.getBoolean("stackmultipliers") !== null) updates.stackMultipliers = opts.getBoolean("stackmultipliers");
      if (opts.getString("timezone")      !== null) updates.timezone        = opts.getString("timezone");

      if (Object.keys(updates).length === 0) {
        return reply(ctx, { embeds: [embeds.error("Please provide at least one option to update.")] });
      }

      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: updates, $setOnInsert: { guildId: guild.id } },
        { upsert: true }
      );

      const lines = Object.entries(updates).map(([k, v]) => `**${k}:** \`${v}\``).join("\n");
      return reply(ctx, { embeds: [embeds.success(`Updated settings:\n${lines}`, "⚙️ Config Updated")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `enable`, `disable`, `reset`, `config`.")] });
  },
};
