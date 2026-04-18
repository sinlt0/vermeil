// ============================================================
//  events/guild/ticketActivity.js
//  Updates lastActivity on messages in ticket channels
// ============================================================
const { fromConnection: Ticket } = require("../../models/Ticket");

module.exports = {
  name: "messageCreate",
  once: false,

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild)     return;
    if (!client.db)         return;

    try {
      const guildDb = await client.db.getGuildDb(message.guild.id);
      if (!guildDb || guildDb.isDown) return;

      const TicketModel = Ticket(guildDb.connection);
      await TicketModel.findOneAndUpdate(
        { channelId: message.channel.id, status: "open" },
        { $set: { lastActivity: new Date(), warnSent: false } }
      );
    } catch {}
  },
};
