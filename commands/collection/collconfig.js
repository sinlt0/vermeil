const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds = require("../../utils/embeds");
const { fromConnection: CollectorSettings } = require("../../models/collector/CollectorSettings");

module.exports = {
  name: "collconfig",
  description: "Configure the collection system for this server.",
  category: "collection",
  aliases: ["cconfig", "gachaconfig"],
  usage: "<subcommand>",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const sub = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const SettingsModel = CollectorSettings(guildDb.connection);
    let settings = await SettingsModel.findOne({ guildId: guild.id });
    if (!settings) settings = await SettingsModel.create({ guildId: guild.id });

    // ── CHANNEL ──
    if (sub === "channel") {
      const channel = ctx.type === "prefix" ? ctx.message.mentions.channels.first() : ctx.interaction.options.getChannel("channel");
      const channelId = channel?.id || (ctx.args[1] === "reset" ? null : null);

      await SettingsModel.findOneAndUpdate({ guildId: guild.id }, { $set: { spawnChannelId: channelId } });
      return reply(ctx, { embeds: [embeds.success(channelId ? `Rolls are now restricted to ${channel}.` : "Roll restriction removed. System works in all channels.")] });
    }

    // ── TIMERS ──
    if (sub === "timers") {
      const rollTime = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("roll_minutes");
      const claimTime = ctx.type === "prefix" ? parseInt(ctx.args[2]) : ctx.interaction.options.getInteger("claim_minutes");

      const update = {};
      if (!isNaN(rollTime)) update.rollResetMinutes = rollTime;
      if (!isNaN(claimTime)) update.claimResetMinutes = claimTime;

      await SettingsModel.findOneAndUpdate({ guildId: guild.id }, { $set: update });
      return reply(ctx, { embeds: [embeds.success("Collection timers updated successfully.")] });
    }

    // ── TOGGLE ──
    if (sub === "toggle") {
      const newState = !settings.enabled;
      await SettingsModel.findOneAndUpdate({ guildId: guild.id }, { $set: { enabled: newState } });
      return reply(ctx, { embeds: [embeds.success(`Collection system is now **${newState ? "enabled" : "disabled"}**.`)] });
    }
  },
};