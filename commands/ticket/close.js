// ============================================================
//  commands/ticket/close.js
//  Close a ticket
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/Ticket");
const { closeTicket }    = require("../../utils/ticketUtils");

module.exports = {
  name:             "close",
  description:      "Close the current ticket.",
  category:         "ticket",
  aliases:          ["closeticket"],
  usage:            "[reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket.")
    .addStringOption(o => o.setName("reason").setDescription("Reason for closing.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const user    = ctx.type === "prefix" ? ctx.message.author  : ctx.interaction.user;
    const member  = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    // Verify this is a ticket channel
    const TicketModel = fromConnection(guildDb.connection);
    const ticket = await TicketModel.findOne({ channelId: channel.id, status: "open" });
    if (!ticket) return reply(ctx, { embeds: [embeds.error("This channel is not an active ticket.")] });

    // Only ticket creator or mods can close
    const isMod = member.permissions.has("ManageMessages");
    const isCreator = ticket.userId === user.id;
    if (!isMod && !isCreator) {
      return reply(ctx, { embeds: [embeds.error("Only the ticket creator or moderators can close this ticket.")] });
    }

    const reason = ctx.type === "prefix"
      ? ctx.args.join(" ") || "No reason provided."
      : ctx.interaction.options.getString("reason") || "No reason provided.";

    await reply(ctx, { embeds: [embeds.info("🔒 Closing ticket and generating transcript...")] });

    const result = await closeTicket(client, guild, channel, user, guildDb, reason);
    if (result.error) {
      return reply(ctx, { embeds: [embeds.error(result.error)] });
    }
  },
};
