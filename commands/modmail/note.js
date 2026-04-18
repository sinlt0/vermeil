// ============================================================
//  commands/modmail/note.js
//  Internal staff note — NOT sent to user
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply }                          = require("../../utils/commandRunner");
const embeds                             = require("../../utils/embeds");
const { fromConnection: ModmailThread }  = require("../../models/ModmailThread");
const { COLORS }                         = require("../../utils/modmailUtils");

module.exports = {
  name:             "note",
  description:      "Add an internal staff note to the thread (not sent to user).",
  category:         "modmail",
  aliases:          ["n", "staffnote"],
  usage:            "<message>",
  cooldown:         2,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("note")
    .setDescription("Add an internal staff note (not sent to user).")
    .addStringOption(o => o.setName("message").setDescription("The note content.").setRequired(true))
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

    if (!message) return reply(ctx, { embeds: [embeds.error("Please provide a note.")] });

    const noteEmbed = new EmbedBuilder()
      .setColor(COLORS.note)
      .setAuthor({ name: `📝 Note — ${staff.user.tag}`, iconURL: staff.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(message)
      .setFooter({ text: "Internal Note • Not visible to user" })
      .setTimestamp();

    await channel.send({ embeds: [noteEmbed] });

    if (ctx.type === "prefix") await ctx.message.delete().catch(() => {});
    else await ctx.interaction.reply({ content: "✅ Note added.", ephemeral: true });
  },
};
