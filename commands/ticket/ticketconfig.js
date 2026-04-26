// ============================================================
//  commands/ticket/ticketconfig.js
//  Configure server-wide ticket settings
//  Subcommands: logchannel, transcriptchannel, ticketlimit,
//               autoclose, warntime, enable, disable
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/TicketConfig");
const { parseDuration, formatDuration } = require("../../utils/modUtils");

module.exports = {
  name:             "ticketconfig",
  description:      "Configure server-wide ticket system settings.",
  category:         "ticket",
  aliases:          ["tconfig"],
  usage:            "<subcommand> [options]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("ticketconfig")
    .setDescription("Configure server-wide ticket system settings.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("enable").setDescription("Enable the ticket system."))
    .addSubcommand(sub => sub.setName("disable").setDescription("Disable the ticket system."))
    .addSubcommand(sub => sub.setName("logchannel")
      .setDescription("Set the ticket log channel.")
      .addChannelOption(o => o.setName("channel").setDescription("Log channel (leave empty to clear).").addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("transcriptchannel")
      .setDescription("Set the transcript channel.")
      .addChannelOption(o => o.setName("channel").setDescription("Transcript channel (leave empty to clear).").addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("ticketlimit")
      .setDescription("Set max open tickets per user.")
      .addIntegerOption(o => o.setName("limit").setDescription("Max tickets per user.").setRequired(true).setMinValue(1).setMaxValue(10))
    )
    .addSubcommand(sub => sub.setName("autoclose")
      .setDescription("Set auto-close inactivity time.")
      .addStringOption(o => o.setName("duration").setDescription('Duration e.g. 24h, 48h, 7d. Use "disable" to turn off.').setRequired(true))
    )
    .addSubcommand(sub => sub.setName("warntime")
      .setDescription("Set warn-before-close time.")
      .addStringOption(o => o.setName("duration").setDescription("Time before close to warn e.g. 1h, 30m.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("view").setDescription("View current ticket config."))
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const TicketConfigModel = fromConnection(guildDb.connection);

    let sub;
    if (ctx.type === "prefix") {
      sub = ctx.args[0]?.toLowerCase();
    } else {
      sub = ctx.interaction.options.getSubcommand();
    }

    if (sub === "enable") {
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { enabled: true }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success("Ticket system has been **enabled**.", "✅ Tickets Enabled")] });
    }

    if (sub === "disable") {
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { enabled: false } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success("Ticket system has been **disabled**.", "❌ Tickets Disabled")] });
    }

    if (sub === "logchannel") {
      const channel = ctx.type === "prefix"
        ? ctx.message.mentions.channels.first()
        : ctx.interaction.options.getChannel("channel");
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { logChannel: channel?.id ?? null }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(channel ? `Log channel set to ${channel}.` : "Log channel cleared.", "⚙️ Log Channel")] });
    }

    if (sub === "transcriptchannel") {
      const channel = ctx.type === "prefix"
        ? ctx.message.mentions.channels.first()
        : ctx.interaction.options.getChannel("channel");
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { transcriptChannel: channel?.id ?? null }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(channel ? `Transcript channel set to ${channel}.` : "Transcript channel cleared.", "⚙️ Transcript Channel")] });
    }

    if (sub === "ticketlimit") {
      const limit = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("limit");
      if (!limit || limit < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid limit.")] });
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { ticketLimit: limit }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(`Ticket limit set to **${limit}** per user.`, "⚙️ Ticket Limit")] });
    }

    if (sub === "autoclose") {
      const durStr = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("duration");
      if (durStr?.toLowerCase() === "disable") {
        await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { autoCloseTime: null } }, { upsert: true });
        return reply(ctx, { embeds: [embeds.success("Auto-close has been **disabled**.", "⚙️ Auto-Close")] });
      }
      const duration = parseDuration(durStr);
      if (!duration) return reply(ctx, { embeds: [embeds.error('Invalid duration. Example: `24h`, `48h`, `7d`. Use `disable` to turn off.')] });
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { autoCloseTime: duration }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(`Auto-close set to **${formatDuration(duration)}** of inactivity.`, "⚙️ Auto-Close")] });
    }

    if (sub === "warntime") {
      const durStr = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("duration");
      const duration = parseDuration(durStr);
      if (!duration) return reply(ctx, { embeds: [embeds.error("Invalid duration. Example: `1h`, `30m`.")] });
      await TicketConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { warnTime: duration }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(`Warning will be sent **${formatDuration(duration)}** before auto-close.`, "⚙️ Warn Time")] });
    }

    if (sub === "view") {
      const config = await TicketConfigModel.findOne({ guildId: guild.id });
      const embed  = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle("🎫 Ticket System Configuration")
        .addFields(
          { name: "Status",              value: config?.enabled ? "✅ Enabled" : "❌ Disabled",                                    inline: true  },
          { name: "Ticket Limit",        value: `\`${config?.ticketLimit ?? 1}\` per user`,                                        inline: true  },
          { name: "Log Channel",         value: config?.logChannel ? `<#${config.logChannel}>` : "*(not set)*",                    inline: true  },
          { name: "Transcript Channel",  value: config?.transcriptChannel ? `<#${config.transcriptChannel}>` : "*(not set)*",      inline: true  },
          { name: "Auto-Close",          value: config?.autoCloseTime ? formatDuration(config.autoCloseTime) : "Disabled",         inline: true  },
          { name: "Warn Before Close",   value: config?.warnTime ? formatDuration(config.warnTime) : "*(not set)*",                inline: true  },
        )
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `enable`, `disable`, `logchannel`, `transcriptchannel`, `ticketlimit`, `autoclose`, `warntime`, `view`.")] });
  },
};
