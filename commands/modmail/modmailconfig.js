// ============================================================
//  commands/modmail/modmailconfig.js
//  Configure the modmail system
// ============================================================
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { reply }                         = require("../../utils/commandRunner");
const embeds                            = require("../../utils/embeds");
const { fromConnection: ModmailConfig } = require("../../models/ModmailConfig");
const { parseDuration, formatDuration } = require("../../utils/modUtils");

module.exports = {
  name:             "modmailconfig",
  description:      "Configure the modmail system.",
  category:         "modmail",
  aliases:          ["mmconfig"],
  usage:            "<subcommand> [options]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("modmailconfig")
    .setDescription("Configure the modmail system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("enable").setDescription("Enable modmail."))
    .addSubcommand(sub => sub.setName("disable").setDescription("Disable modmail."))
    .addSubcommand(sub => sub.setName("category")
      .setDescription("Set the modmail thread category.")
      .addChannelOption(o => o.setName("category").setDescription("Discord category for threads.").addChannelTypes(ChannelType.GuildCategory).setRequired(true))
    )
    .addSubcommand(sub => sub.setName("archive")
      .setDescription("Set the archive category.")
      .addChannelOption(o => o.setName("category").setDescription("Discord category for archived threads.").addChannelTypes(ChannelType.GuildCategory).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("logchannel")
      .setDescription("Set the log/transcript channel.")
      .addChannelOption(o => o.setName("channel").setDescription("Log channel.").addChannelTypes(ChannelType.GuildText).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("alertrole")
      .setDescription("Set the alert role pinged on new threads.")
      .addRoleOption(o => o.setName("role").setDescription("Alert role.").setRequired(false))
    )
    .addSubcommand(sub => sub.setName("greetmessage")
      .setDescription("Set the greeting message sent to users when thread opens.")
      .addStringOption(o => o.setName("message").setDescription("Greet message.").setRequired(true).setMaxLength(2000))
    )
    .addSubcommand(sub => sub.setName("closemessage")
      .setDescription("Set the message sent to users when thread closes.")
      .addStringOption(o => o.setName("message").setDescription("Close message.").setRequired(true).setMaxLength(2000))
    )
    .addSubcommand(sub => sub.setName("minage")
      .setDescription("Set minimum account/server age to use modmail.")
      .addIntegerOption(o => o.setName("accountdays").setDescription("Min account age in days.").setMinValue(0).setRequired(false))
      .addIntegerOption(o => o.setName("serverdays").setDescription("Min server age in days.").setMinValue(0).setRequired(false))
    )
    .addSubcommand(sub => sub.setName("view").setDescription("View current modmail config."))
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ModmailConfigModel = ModmailConfig(guildDb.connection);

    let sub;
    if (ctx.type === "prefix") sub = ctx.args[0]?.toLowerCase();
    else sub = ctx.interaction.options.getSubcommand();

    if (sub === "enable") {
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { enabled: true }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success("Modmail has been **enabled**! Users can now DM the bot to open a thread.", "✅ Modmail Enabled")] });
    }

    if (sub === "disable") {
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { enabled: false } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success("Modmail has been **disabled**.", "❌ Modmail Disabled")] });
    }

    if (sub === "category") {
      const cat = ctx.type === "prefix" ? guild.channels.cache.get(ctx.args[1]) : ctx.interaction.options.getChannel("category");
      if (!cat) return reply(ctx, { embeds: [embeds.error("Please provide a valid category.")] });
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { categoryId: cat.id }, $setOnInsert: { guildId: guild.id } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(`Modmail threads will be created in **${cat.name}**.`, "⚙️ Category Set")] });
    }

    if (sub === "archive") {
      const cat = ctx.type === "prefix" ? guild.channels.cache.get(ctx.args[1]) : ctx.interaction.options.getChannel("category");
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { archiveCategoryId: cat?.id ?? null } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(cat ? `Archive category set to **${cat.name}**.` : "Archive category cleared. Closed threads will be deleted.", "⚙️ Archive Set")] });
    }

    if (sub === "logchannel") {
      const channel = ctx.type === "prefix" ? ctx.message.mentions.channels.first() : ctx.interaction.options.getChannel("channel");
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { logChannelId: channel?.id ?? null } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(channel ? `Log channel set to ${channel}.` : "Log channel cleared.", "⚙️ Log Channel")] });
    }

    if (sub === "alertrole") {
      const role = ctx.type === "prefix" ? ctx.message.mentions.roles.first() : ctx.interaction.options.getRole("role");
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { alertRoleId: role?.id ?? null } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(role ? `Alert role set to <@&${role.id}>.` : "Alert role cleared.", "⚙️ Alert Role")] });
    }

    if (sub === "greetmessage") {
      const message = ctx.type === "prefix" ? ctx.args.slice(1).join(" ") : ctx.interaction.options.getString("message");
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { greetMessage: message } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(`Greet message set.\n**Preview:** ${message}`, "⚙️ Greet Message")] });
    }

    if (sub === "closemessage") {
      const message = ctx.type === "prefix" ? ctx.args.slice(1).join(" ") : ctx.interaction.options.getString("message");
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { closeMessage: message } }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(`Close message set.\n**Preview:** ${message}`, "⚙️ Close Message")] });
    }

    if (sub === "minage") {
      const accDays = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("accountdays");
      const srvDays = ctx.type === "prefix" ? parseInt(ctx.args[2]) : ctx.interaction.options.getInteger("serverdays");
      const updates = {};
      if (!isNaN(accDays)) updates.minAccountAge = accDays;
      if (!isNaN(srvDays)) updates.minServerAge  = srvDays;
      await ModmailConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: updates }, { upsert: true });
      return reply(ctx, { embeds: [embeds.success(
        `Minimum ages updated.\n` +
        (!isNaN(accDays) ? `**Account Age:** ${accDays} days\n` : "") +
        (!isNaN(srvDays) ? `**Server Age:** ${srvDays} days` : ""),
        "⚙️ Minimum Age"
      )] });
    }

    if (sub === "view") {
      const config = await ModmailConfigModel.findOne({ guildId: guild.id });
      const embed  = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("📬 Modmail Configuration")
        .addFields(
          { name: "Status",           value: config?.enabled ? "✅ Enabled" : "❌ Disabled",                              inline: true  },
          { name: "Category",         value: config?.categoryId ? `<#${config.categoryId}>` : "*(not set)*",              inline: true  },
          { name: "Archive Category", value: config?.archiveCategoryId ? `<#${config.archiveCategoryId}>` : "Delete on close", inline: true },
          { name: "Log Channel",      value: config?.logChannelId ? `<#${config.logChannelId}>` : "*(not set)*",          inline: true  },
          { name: "Alert Role",       value: config?.alertRoleId ? `<@&${config.alertRoleId}>` : "*(not set)*",           inline: true  },
          { name: "Min Account Age",  value: `${config?.minAccountAge ?? 0} days`,                                        inline: true  },
          { name: "Min Server Age",   value: `${config?.minServerAge ?? 0} days`,                                         inline: true  },
          { name: "Greet Message",    value: config?.greetMessage ?? "*(default)*",                                       inline: false },
          { name: "Close Message",    value: config?.closeMessage ?? "*(default)*",                                       inline: false },
        )
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand.")] });
  },
};
