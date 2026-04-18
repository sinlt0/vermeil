// ============================================================
//  commands/ticket/rename.js
//  Rename the current ticket channel
// ============================================================
const { SlashCommandBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/Ticket");

module.exports = {
  name:             "rename",
  description:      "Rename the current ticket channel.",
  category:         "ticket",
  aliases:          [],
  usage:            "<new name>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("rename")
    .setDescription("Rename the current ticket channel.")
    .addStringOption(o => o.setName("name").setDescription("New channel name.").setRequired(true).setMaxLength(100))
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

    const newName = (ctx.type === "prefix" ? ctx.args.join("-") : ctx.interaction.options.getString("name"))
      .toLowerCase().replace(/[^a-z0-9-]/g, "-").substring(0, 100);

    await channel.setName(newName);
    return reply(ctx, { embeds: [embeds.success(`Ticket renamed to **${newName}**.`, "✅ Renamed")] });
  },
};
