// ============================================================
//  commands/leveling/level.js
//  Configure level up messages and channels
//  Subcommands: setchannel, toggledm, setmessage, messageedit
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { reply }               = require("../../utils/commandRunner");
const embeds                  = require("../../utils/embeds");
const { fromConnection: LevelSettings } = require("../../models/LevelSettings");

const VARIABLES_REF =
  "`{user}` `{username}` `{userdisplayname}` `{usernick}` `{level}` `{currentlv}` `{previouslv}`\n" +
  "`{xp}` `{nextlevelxp}` `{rank}` `{rolereward}` `{server}` `{membercount}`";

module.exports = {
  name:             "level",
  description:      "Configure level up messages and channels.",
  category:         "leveling",
  aliases:          ["levelup", "lvlcfg"],
  usage:            "<setchannel|toggledm|setmessage|messageedit> [args]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("level")
    .setDescription("Configure level up messages.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("setchannel")
      .setDescription("Set the level up announcement channel.")
      .addChannelOption(o => o.setName("channel").setDescription("Channel for level up messages (leave empty to use same channel).").addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("toggledm")
      .setDescription("Toggle sending level up messages via DM.")
    )
    .addSubcommand(sub => sub.setName("setmessage")
      .setDescription("Set the global level up message.")
      .addStringOption(o => o.setName("message").setDescription("The level up message. Use variables like {user}, {level}.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("messageedit")
      .setDescription("Set a custom message for a specific level.")
      .addIntegerOption(o => o.setName("level").setDescription("The level to set a message for.").setRequired(true).setMinValue(1))
      .addStringOption(o => o.setName("message").setDescription("Custom message for this level. Leave empty to remove.").setRequired(false))
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

    let sub, channel, message, level;
    if (ctx.type === "prefix") {
      sub     = ctx.args[0]?.toLowerCase();
      channel = ctx.message.mentions.channels.first();
      level   = parseInt(ctx.args[1]);
      message = ctx.args.slice(sub === "messageedit" ? 2 : 1).join(" ");
    } else {
      sub     = ctx.interaction.options.getSubcommand();
      channel = ctx.interaction.options.getChannel("channel");
      message = ctx.interaction.options.getString("message");
      level   = ctx.interaction.options.getInteger("level");
    }

    // SET CHANNEL
    if (sub === "setchannel") {
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { levelUpChannel: channel?.id ?? null } }
      );
      return reply(ctx, { embeds: [embeds.success(
        channel ? `Level up messages will be sent in ${channel}.` : "Level up messages will be sent in the same channel as the trigger message.",
        "✅ Channel Set"
      )] });
    }

    // TOGGLE DM
    if (sub === "toggledm") {
      const newState = !settings.levelUpDM;
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { levelUpDM: newState } }
      );
      return reply(ctx, { embeds: [embeds.success(
        `Level up DM is now **${newState ? "enabled" : "disabled"}**.`,
        `${newState ? "✅" : "❌"} DM ${newState ? "Enabled" : "Disabled"}`
      )] });
    }

    // SET GLOBAL MESSAGE
    if (sub === "setmessage") {
      if (!message) return reply(ctx, { embeds: [embeds.error(`Please provide a message.\n\n**Variables:**\n${VARIABLES_REF}`)] });
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { levelUpMessage: message } }
      );
      return reply(ctx, { embeds: [embeds.success(
        `Global level up message set.\n**Preview:** ${message}\n\n**Variables:**\n${VARIABLES_REF}`,
        "✅ Message Set"
      )] });
    }

    // SET CUSTOM MESSAGE PER LEVEL
    if (sub === "messageedit") {
      if (!level || level < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid level.")] });

      if (!message) {
        // Remove custom message for this level
        await LevelSettingsModel.findOneAndUpdate(
          { guildId: guild.id },
          { $pull: { customMessages: { level } } }
        );
        return reply(ctx, { embeds: [embeds.success(`Custom message for level **${level}** removed. Will use global message.`, "✅ Message Removed")] });
      }

      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { customMessages: { level } } }
      );
      await LevelSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { $push: { customMessages: { level, message } } }
      );
      return reply(ctx, { embeds: [embeds.success(
        `Custom message for level **${level}** set.\n**Preview:** ${message}`,
        "✅ Custom Message Set"
      )] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `setchannel`, `toggledm`, `setmessage`, `messageedit`.")] });
  },
};
