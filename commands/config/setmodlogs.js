// ============================================================
//  commands/admin/setmodlogs.js
//  Set or clear the mod log channel for this server
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js");
const { reply }           = require("../../utils/commandRunner");
const embeds              = require("../../utils/embeds");
const { fromConnection }  = require("../../models/GuildSettings");

module.exports = {
  name:             "setmodlogs",
  description:      "Set or clear the moderation log channel.",
  category:         "config",
  aliases:          ["modlogs", "setmodlog"],
  usage:            "<#channel|clear>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("setmodlogs")
    .setDescription("Set or clear the moderation log channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((o) =>
      o.setName("channel")
        .setDescription("The channel to send mod logs to. Leave empty to clear.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });
    }

    const GuildSettingsModel = fromConnection(guildDb.connection);

    let channel = null;
    let clearing = false;

    if (ctx.type === "prefix") {
      const arg = ctx.args[0];
      if (!arg || arg.toLowerCase() === "clear") {
        clearing = true;
      } else {
        channel = ctx.message.mentions.channels.first()
          || guild.channels.cache.get(arg);
        if (!channel) return reply(ctx, { embeds: [embeds.error("Channel not found.")] });
      }
    } else {
      channel = ctx.interaction.options.getChannel("channel");
      if (!channel) clearing = true;
    }

    if (clearing) {
      await GuildSettingsModel.findOneAndUpdate(
        { guildId: guild.id },
        { guildId: guild.id, modLogChannel: null },
        { upsert: true }
      );
      return reply(ctx, {
        embeds: [embeds.success("Mod log channel has been **cleared**. Mod logs are now disabled.", "⚙️ Mod Logs Cleared")],
      });
    }

    // Verify bot can send messages in the channel
    if (!channel.permissionsFor(guild.members.me).has("SendMessages")) {
      return reply(ctx, { embeds: [embeds.error(`I don't have permission to send messages in ${channel}.`)] });
    }

    await GuildSettingsModel.findOneAndUpdate(
      { guildId: guild.id },
      { guildId: guild.id, modLogChannel: channel.id },
      { upsert: true }
    );

    // Send a test embed to the channel
    const testEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle("✅ Mod Logs Enabled")
      .setDescription("This channel has been set as the mod log channel.\nAll moderation actions will be logged here.")
      .setTimestamp();

    await channel.send({ embeds: [testEmbed] }).catch(() => {});

    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    return reply(ctx, {
      embeds: [
        new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle("⚙️ Mod Logs Set")
          .setDescription(`Mod logs will now be sent to ${channel}.`)
          .setFooter({ text: `Set by ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
          .setTimestamp(),
      ],
    });
  },
};
