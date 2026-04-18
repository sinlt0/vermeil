// ============================================================
//  events/guild/guildMemberRemove.js
//  Fires leave message when a member leaves
// ============================================================
const { fromConnection } = require("../../models/GreetSettings");
const { sendGreetMessage } = require("../../utils/greetUtils");

module.exports = {
  name: "guildMemberRemove",
  once: false,

  async execute(client, member) {
    if (!client.db) return;

    try {
      const guildDb = await client.db.getGuildDb(member.guild.id);
      if (!guildDb || guildDb.isDown) return;

      const GreetSettingsModel = fromConnection(guildDb.connection);
      const settings = await GreetSettingsModel.findOne({ guildId: member.guild.id });
      
      if (settings?.leave?.enabled) {
        await sendGreetMessage(client, member, "leave", settings);
      }
    } catch (err) {
      console.error("[guildMemberRemove] Error:", err.message);
    }
  },
};
