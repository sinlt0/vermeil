// ============================================================
//  commands/ticket/claim.js
//  Claim or unclaim a ticket
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/Ticket");

module.exports = {
  name:             "claim",
  description:      "Claim the current ticket.",
  category:         "ticket",
  aliases:          [],
  usage:            "",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Claim the current ticket.")
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const user    = ctx.type === "prefix" ? ctx.message.author  : ctx.interaction.user;
    const member  = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;

    if (!member.permissions.has("ManageMessages")) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Messages** permission to claim tickets.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const TicketModel = fromConnection(guildDb.connection);
    const ticket = await TicketModel.findOne({ channelId: channel.id, status: "open" });
    if (!ticket) return reply(ctx, { embeds: [embeds.error("This channel is not an active ticket.")] });

    if (ticket.claimedBy === user.id) {
      await TicketModel.findOneAndUpdate({ channelId: channel.id }, { $set: { claimedBy: null } });
      return reply(ctx, { embeds: [embeds.info(`${user} has **unclaimed** this ticket.`, "✋ Unclaimed")] });
    }

    if (ticket.claimedBy) {
      return reply(ctx, { embeds: [embeds.error(`This ticket is already claimed by <@${ticket.claimedBy}>.`)] });
    }

    await TicketModel.findOneAndUpdate({ channelId: channel.id }, { $set: { claimedBy: user.id } });
    return reply(ctx, { embeds: [embeds.success(`${user} has **claimed** this ticket and will assist you shortly.`, "✋ Ticket Claimed")] });
  },
};
