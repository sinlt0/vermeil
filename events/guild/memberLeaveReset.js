// ============================================================
//  events/guild/memberLeaveReset.js
//  Resets XP when a member leaves the server
// ============================================================
const { fromConnection: UserLevel } = require("../../models/UserLevel");
const chalk = require("chalk");

module.exports = {
  name: "guildMemberRemove",
  once: false,

  async execute(client, member) {
    if (!client.db) return;
    try {
      const guildDb = await client.db.getGuildDb(member.guild.id);
      if (!guildDb || guildDb.isDown) return;

      const UserLevelModel = UserLevel(guildDb.connection);
      await UserLevelModel.deleteOne({ guildId: member.guild.id, userId: member.id });
    } catch {}
  },
};
