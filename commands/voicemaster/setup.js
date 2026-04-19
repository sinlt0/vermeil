const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: VoiceMasterConfig } = require("../../models/voicemaster/VoiceMasterConfig");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-setup",
  description: "Set up the Join-to-Create voice system.",
  category: "voicemaster",
  usage: "<#channel> [categoryID]",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    if (!ctx.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { content: "❌ You need `Manage Server` permissions to use this." });
    }

    const channel = ctx.type === "prefix" ? ctx.message.mentions.channels.first() : ctx.interaction.options.getChannel("channel");
    const category = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getChannel("category");

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return reply(ctx, { content: "❌ Please provide a valid **Voice Channel** for the setup." });
    }

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ConfigModel = VoiceMasterConfig(guildDb.connection);

    await ConfigModel.findOneAndUpdate(
      { guildId: ctx.guild.id },
      { 
        $set: { 
          enabled: true, 
          channelId: channel.id, 
          categoryId: category?.id || channel.parentId 
        } 
      },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`${e.settings} VoiceMaster Setup Complete`)
      .setDescription(`Users can now join ${channel} to create their own private voice channels!`)
      .addFields(
        { name: "Hub Channel", value: `${channel}`, inline: true },
        { name: "Category", value: category ? `${category}` : "Original Category", inline: true }
      );

    return reply(ctx, { embeds: [embed] });
  },
};