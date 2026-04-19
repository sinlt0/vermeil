const { PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");

module.exports = {
  name: "vm-transfer",
  description: "Transfer ownership of your voice channel.",
  category: "voicemaster",
  usage: "<@user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    const targetUser = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    if (!targetUser) return reply(ctx, { content: "❌ Please mention a user to transfer ownership to." });
    if (targetUser.bot) return reply(ctx, { content: "❌ You cannot transfer to a bot!" });
    if (targetUser.id === ctx.author.id) return reply(ctx, { content: "❌ You are already the owner!" });

    const member = ctx.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return reply(ctx, { content: "❌ You must be in your channel." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id, ownerId: member.id });

    if (!data) return reply(ctx, { content: "❌ You don't own this channel!" });

    // Update DB
    data.ownerId = targetUser.id;
    await data.save();

    // Update permissions
    await voiceChannel.permissionOverwrites.edit(targetUser.id, {
      ManageChannels: true,
      Connect: true,
      MoveMembers: true
    });

    return reply(ctx, { content: `🤝 Ownership has been transferred to **${targetUser.username}**.` });
  },
};