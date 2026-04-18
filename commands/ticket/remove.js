// ============================================================
//  commands/ticket/remove.js
//  Remove a user from the current ticket
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/Ticket");

module.exports = {
  name:             "remove",
  description:      "Remove a user from the current ticket.",
  category:         "ticket",
  aliases:          ["removeuser"],
  usage:            "<@user>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Remove a user from the current ticket.")
    .addUserOption(o => o.setName("user").setDescription("User to remove.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const member  = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;

    if (!member.permissions.has("ManageMessages")) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Messages** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const TicketModel = fromConnection(guildDb.connection);
    const ticket = await TicketModel.findOne({ channelId: channel.id, status: "open" });
    if (!ticket) return reply(ctx, { embeds: [embeds.error("This channel is not an active ticket.")] });

    const target = ctx.type === "prefix"
      ? ctx.message.mentions.members.first()
      : await guild.members.fetch(ctx.interaction.options.getUser("user").id).catch(() => null);

    if (!target) return reply(ctx, { embeds: [embeds.error("Member not found.")] });
    if (target.id === ticket.userId) return reply(ctx, { embeds: [embeds.error("You cannot remove the ticket creator.")] });

    await channel.permissionOverwrites.edit(target.id, { ViewChannel: false });
    return reply(ctx, { embeds: [embeds.success(`${target} has been removed from the ticket.`, "✅ User Removed")] });
  },
};
