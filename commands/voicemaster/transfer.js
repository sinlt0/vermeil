const { PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-transfer",
  description: "Transfer ownership of your voice channel.",
  category: "voicemaster",
  usage: "<@user>",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

    const targetUser = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    if (!targetUser) return reply(ctx, { content: `${e.error} Please mention a user to transfer ownership to.` });
    if (targetUser.bot) return reply(ctx, { content: `${e.error} You cannot transfer to a bot!` });
    if (targetUser.id === member.id) return reply(ctx, { content: `${e.error} You are already the owner!` });

    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return reply(ctx, { content: `${e.error} You must be in your channel.` });

    const guildDb = await client.db.getGuildDb(guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id, ownerId: member.id });

    if (!data) return reply(ctx, { content: `${e.error} You don't own this channel!` });

    // Update DB
    data.ownerId = targetUser.id;
    await data.save();

    // Update permissions
    await voiceChannel.permissionOverwrites.edit(targetUser.id, {
      ManageChannels: true,
      Connect: true,
      MoveMembers: true
    });

    return reply(ctx, { content: `${e.transfer} Ownership has been transferred to **${targetUser.username}**.` });
  },
};