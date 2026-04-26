// ============================================================
//  commands/modmail/areply.js
//  Anonymous reply — hides staff identity from user
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply }                          = require("../../utils/commandRunner");
const embeds                             = require("../../utils/embeds");
const { fromConnection: ModmailThread }  = require("../../models/ModmailThread");
const { relayToUser, COLORS }            = require("../../utils/modmailUtils");

module.exports = {
  name:             "areply",
  description:      "Send an anonymous reply to the modmail thread.",
  category:         "modmail",
  aliases:          ["ar", "anonreply"],
  usage:            "<message>",
  cooldown:         2,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("areply")
    .setDescription("Send an anonymous reply to the modmail thread.")
    .addStringOption(o => o.setName("message").setDescription("Your anonymous reply.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const staff   = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ModmailThreadModel = ModmailThread(guildDb.connection);
    const thread = await ModmailThreadModel.findOne({ channelId: channel.id, status: { $ne: "closed" } });
    if (!thread) return reply(ctx, { embeds: [embeds.error("This is not an active modmail thread.")] });

    const message = ctx.type === "prefix"
      ? ctx.args.join(" ")
      : ctx.interaction.options.getString("message");

    if (!message) return reply(ctx, { embeds: [embeds.error("Please provide a message.")] });

    const user = await client.users.fetch(thread.userId).catch(() => null);
    if (!user) return reply(ctx, { embeds: [embeds.error("Could not find the user.")] });

    await relayToUser(client, user, guild, message, staff, true);

    // Echo in thread (shows who sent anon reply to staff)
    const threadEmbed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setAuthor({ name: `${staff.user.tag} (Anonymous)`, iconURL: staff.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(message)
      .setFooter({ text: "Anonymous Reply — user sees this as Support Team" })
      .setTimestamp();

    await channel.send({ embeds: [threadEmbed] });

    if (ctx.type === "prefix") await ctx.message.delete().catch(() => {});
    else await ctx.interaction.reply({ content: "✅ Anonymous reply sent.", ephemeral: true });

    await ModmailThreadModel.findOneAndUpdate({ channelId: channel.id }, { $inc: { messageCount: 1 } });
  },
};
