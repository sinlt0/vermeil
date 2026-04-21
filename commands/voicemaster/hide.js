const { PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-hide",
  description: "Hide your voice channel from others.",
  category: "voicemaster",
  usage: "",
  cooldown: 3,
  slash: false,
  requiresDatabase: true,

  async execute(client, ctx) {
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

    const voiceChannel = member.voice.channel;

    if (!voiceChannel) return reply(ctx, { content: "❌ You must be in your voice channel to hide it." });

    const guildDb = await client.db.getGuildDb(guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id, ownerId: member.id });

    if (!data) return reply(ctx, { content: "❌ You don't own this voice channel!" });

    await voiceChannel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: false
    });

    return reply(ctx, { content: `${e.hide} Your voice channel is now **hidden**.` });
  },
};