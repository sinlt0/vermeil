const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-limit",
  description: "Set the user limit for your voice channel.",
  category: "voicemaster",
  usage: "<number>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    const limit = parseInt(ctx.args[0] || ctx.interaction.options.getInteger("limit"));
    if (isNaN(limit) || limit < 0 || limit > 99) return reply(ctx, { content: "❌ Provide a number between 0 and 99." });

    const member = ctx.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return reply(ctx, { content: "❌ You must be in your channel." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id, ownerId: member.id });

    if (!data) return reply(ctx, { content: "❌ You don't own this channel!" });

    await voiceChannel.setUserLimit(limit);
    return reply(ctx, { content: `${e.limit} Channel limit set to **${limit === 0 ? "Unlimited" : limit}**.` });
  },
};