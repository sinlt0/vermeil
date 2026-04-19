const { PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-unlock",
  description: "Unlock your voice channel.",
  category: "voicemaster",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    const member = ctx.member;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) return reply(ctx, { content: "❌ You must be in your voice channel to unlock it." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id, ownerId: member.id });

    if (!data) return reply(ctx, { content: "❌ You don't own this voice channel!" });

    await voiceChannel.permissionOverwrites.edit(ctx.guild.roles.everyone, {
      Connect: null
    });

    return reply(ctx, { content: `${e.unlock} Your voice channel is now **unlocked**.` });
  },
};