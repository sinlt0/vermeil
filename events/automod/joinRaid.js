// ============================================================
//  events/automod/joinRaid.js
//  guildMemberAdd — raid detection + action
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: JoinRaidConfig } = require("../../models/JoinRaidConfig");
const { fromConnection: AutoModConfig }  = require("../../models/AutoModConfig");
const { fromConnection: Premium }        = require("../../models/Premium");
const { trackJoin, getRecentJoiners, sendRaidAlert } = require("../../utils/automod/joinRaidTracker");
const e = require("../../emojis/automodemoji");

module.exports = {
  name: "guildMemberAdd",
  once: false,

  async execute(client, member) {
    if (!client.db) return;
    const guild   = member.guild;
    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const JRModel = JoinRaidConfig(guildDb.connection);
    const config  = await JRModel.findOne({ guildId: guild.id });
    if (!config?.enabled) return;

    // ── Premium check if restricted ───────────────────────
    if (config.premium) {
      const PremModel = Premium(guildDb.connection);
      const prem      = await PremModel.findOne({ guildId: guild.id, active: true }).lean();
      if (!prem) return;
    }

    const { triggered, count } = trackJoin(guild.id, member.id, config);

    // ── Raid currently active — punish new joins ───────────
    if (config.active && !triggered) {
      await punishMember(guild, member, config.action, "Join raid active — new join flagged");
      return;
    }

    if (!triggered) return;

    // ── Raid just triggered ───────────────────────────────
    await JRModel.findOneAndUpdate(
      { guildId: guild.id },
      { $set: { active: true, triggeredAt: new Date() } }
    );

    // Get automod log channel
    const amConfig  = await AutoModConfig(guildDb.connection).findOne({ guildId: guild.id }).lean();
    const logChannel = guild.channels.cache.get(amConfig?.logChannelId);

    await sendRaidAlert(guild, config, count, logChannel);

    // Punish all recent joiners
    const windowMs     = (config.windowHours ?? 1) * 60 * 60 * 1000;
    const recentJoiners = getRecentJoiners(guild.id, windowMs);

    for (const userId of recentJoiners) {
      const raidMember = await guild.members.fetch(userId).catch(() => null);
      if (!raidMember) continue;
      await punishMember(guild, raidMember, config.action, "Mass join raid detected");
    }
  },
};

async function punishMember(guild, member, action, reason) {
  try {
    if (member.user.bot) return;
    if (member.id === guild.ownerId) return;
    if (action === "ban") await guild.members.ban(member.id, { reason });
    else if (action === "kick") await member.kick(reason);
    else if (action === "timeout") {
      await member.timeout(24 * 60 * 60 * 1000, reason).catch(() => member.kick(reason));
    }
  } catch {}
}
