const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: VoiceMasterConfig } = require("../../models/voicemaster/VoiceMasterConfig");
const { buildInterface } = require("../../utils/voicemaster/voiceInterface");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-setup",
  description: "Initialize the VoiceMaster system with a control panel.",
  category: "voicemaster",
  usage: "<#join-channel> [categoryID]",
  cooldown: 10,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { content: "❌ You need `Manage Server` permissions." });
    }

    // ── Parse Args ──
    let channel, category;
    if (ctx.type === "prefix") {
      channel = ctx.message.mentions.channels.first() || guild.channels.cache.get(ctx.args[1]);
      category = guild.channels.cache.get(ctx.args[2]) || (ctx.args[2] ? { id: ctx.args[2] } : null);
    } else {
      channel = ctx.interaction.options.getChannel("channel");
      category = ctx.interaction.options.getChannel("category");
    }

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return reply(ctx, { content: "❌ Provide a valid **Voice Channel** for users to join." });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    const ConfigModel = VoiceMasterConfig(guildDb.connection);

    try {
      // 1. Create the Interface Channel
      const interfaceChannel = await guild.channels.create({
        name: "interface",
        type: ChannelType.GuildText,
        parent: category?.id || channel.parentId,
        topic: "Manage your temporary voice channels here.",
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionFlagsBits.SendMessages],
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory]
          }
        ]
      });

      // 2. Send the control panel
      const panel = buildInterface(guild);
      await interfaceChannel.send(panel);

      // 3. Save Config
      await ConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { 
          $set: { 
            enabled: true, 
            channelId: channel.id, 
            categoryId: category?.id || channel.parentId,
            interfaceChannelId: interfaceChannel.id
          } 
        },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.settings} VoiceMaster Initialized`)
        .setDescription(`Setup successful! Users can join ${channel} to create rooms.`)
        .addFields(
          { name: "Join Channel", value: `${channel}`, inline: true },
          { name: "Control Panel", value: `${interfaceChannel}`, inline: true }
        );

      return reply(ctx, { embeds: [embed] });

    } catch (err) {
      console.error(err);
      return reply(ctx, { content: "❌ Setup failed. Check bot permissions (Manage Channels)." });
    }
  },
};