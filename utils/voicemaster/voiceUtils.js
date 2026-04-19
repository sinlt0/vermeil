const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { fromConnection: VoiceMasterConfig } = require("../../models/voicemaster/VoiceMasterConfig");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");

async function handleVoiceJoin(client, oldState, newState) {
  const guild = newState.guild;
  const user = newState.member.user;

  const guildDb = await client.db?.getGuildDb(guild.id);
  if (!guildDb || guildDb.isDown) return;

  const config = await VoiceMasterConfig(guildDb.connection).findOne({ guildId: guild.id });
  if (!config || !config.enabled || !config.channelId) return;

  // If user joined the "Join to Create" channel
  if (newState.channelId === config.channelId) {
    try {
      const channelName = config.defaultName.replace("{user}", user.username);
      
      const voiceChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: config.categoryId || newState.channel.parent,
        userLimit: config.defaultLimit,
        permissionOverwrites: [
          {
            id: user.id,
            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers],
          },
        ],
      });

      // Move member to new channel
      await newState.member.voice.setChannel(voiceChannel);

      // Track active channel
      await ActiveVoiceChannel(guildDb.connection).create({
        guildId: guild.id,
        channelId: voiceChannel.id,
        ownerId: user.id,
      });

    } catch (err) {
      console.error("[VoiceMaster] Creation Failed:", err.message);
    }
  }
}

async function handleVoiceLeave(client, oldState, newState) {
  const channel = oldState.channel;
  if (!channel) return;

  const guildDb = await client.db?.getGuildDb(oldState.guild.id);
  if (!guildDb || guildDb.isDown) return;

  const ActiveModel = ActiveVoiceChannel(guildDb.connection);
  const activeData = await ActiveModel.findOne({ channelId: channel.id });

  if (activeData) {
    // If channel is empty, delete it
    if (channel.members.size === 0) {
      try {
        await channel.delete();
        await ActiveModel.deleteOne({ channelId: channel.id });
      } catch (err) {
        console.error("[VoiceMaster] Deletion Failed:", err.message);
      }
    }
  }
}

module.exports = { handleVoiceJoin, handleVoiceLeave };
