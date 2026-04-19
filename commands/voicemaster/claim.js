const { reply } = require("../../utils/commandRunner");
const { fromConnection: ActiveVoiceChannel } = require("../../models/voicemaster/ActiveVoiceChannel");
const e = require("../../emojis/voicemasteremoji");

module.exports = {
  name: "vm-claim",
  description: "Claim ownership of a voice channel if the owner has left.",
  category: "voicemaster",
  usage: "",
  cooldown: 10,
  slash: false,

  async execute(client, ctx) {
    const member = ctx.member;
    const voiceChannel = member.voice.channel;
    if (!voiceChannel) return reply(ctx, { content: "❌ You must be in the channel to claim it." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ActiveModel = ActiveVoiceChannel(guildDb.connection);
    const data = await ActiveModel.findOne({ channelId: voiceChannel.id });

    if (!data) return reply(ctx, { content: "❌ This is not a VoiceMaster channel." });

    // Check if original owner is still in the channel
    const ownerInChannel = voiceChannel.members.has(data.ownerId);
    if (ownerInChannel) return reply(ctx, { content: "❌ The owner is still in the channel!" });

    // Update ownership
    data.ownerId = member.id;
    await data.save();

    return reply(ctx, { content: `${e.claim} You are now the owner of this voice channel!` });
  },
};