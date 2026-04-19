const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-rename",
  description: "Rename your voice channel.",
  category: "voicemaster",
  usage: "<new name>",
  cooldown: 10,
  slash: false,

  async execute(client, ctx) {
    const name = ctx.args.join(" ") || ctx.interaction.options.getString("name");
    if (!name || name.length > 32) return reply(ctx, { content: "❌ Name must be between 1 and 32 characters." });

    const member = ctx.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return reply(ctx, { content: "❌ You must be in your channel." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id, ownerId: member.id });

    if (!data) return reply(ctx, { content: "❌ You don't own this channel!" });

    await voiceChannel.setName(name);
    return reply(ctx, { content: `${e.rename} Channel renamed to **${name}**.` });
  },
};