// ============================================================
//  commands/automod/joinraid.js  (alias: !jr)
//  !joinraid / !jr           — view join raid settings
//  !joinraid 1 ?on/?off      — enable/disable join raid
//  !jr ACTION ?set 2         — set action (timeout/kick/ban)
//  !jr @Role ?add 3          — add warn role
//  !jr @Role ?remove 3       — remove warn role
//  !jr X ?set 4a             — set trigger threshold (accounts)
//  !jr X ?set 4b             — set window hours
//  !joinraid off             — manually end raid mode
//  !joinraid premium ?on/?off— toggle premium-only restriction
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: JoinRaidConfig } = require("../../models/JoinRaidConfig");
const { clearJoinTracker } = require("../../utils/automod/joinRaidTracker");
const e = require("../../emojis/automodemoji");

module.exports = {
  name: "joinraid", description: "Configure the join raid detection system.", category: "automod",
  aliases: ["jr"], usage: "[slot] [?on/?off/?set/?add/?remove] [value]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    if (!canManage(message)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return message.reply(`${e.error} Database unavailable.`);

    const JRModel = JoinRaidConfig(guildDb.connection);
    let config    = await JRModel.findOne({ guildId: guild.id });
    if (!config)  config = await JRModel.create({ guildId: guild.id });

    const slot  = ctx.args[0]?.toLowerCase();
    const flag  = ctx.args[1]?.toLowerCase();
    const value = ctx.args[2]?.toLowerCase();

    const update = async (path, val, label) => {
      await JRModel.findOneAndUpdate({ guildId: guild.id }, { $set: { [path]: val } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${e.success} ${label ?? `Set \`${path.split(".").pop()}\` to \`${val}\``}.`)] });
    };

    // ── VIEW ──────────────────────────────────────────────
    if (!slot) {
      const warnRoleMentions = config.warnRoles?.length
        ? config.warnRoles.map(id => `<@&${id}>`).join(", ")
        : "None";

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.raid} Join Raid Settings — ${guild.name}`)
        .addFields(
          { name: `${config.enabled ? e.on : e.off} [1] Enabled`,      value: config.enabled ? "Yes" : "No",      inline: true },
          { name: `${e.kick} [2] Action`,   value: `\`${config.action}\``,                        inline: true },
          { name: `${config.active ? e.raidOn : e.raidOff} Raid Active`, value: config.active ? "**ACTIVE** 🚨" : "Inactive", inline: true },
          { name: `${e.wave} [4a] Threshold`,value: `\`${config.threshold}\` accounts`,           inline: true },
          { name: `${e.time} [4b] Window`,  value: `\`${config.windowHours}h\``,                  inline: true },
          { name: `${e.ping} [3] Warn Roles`, value: warnRoleMentions,                            inline: false },
          { name: `${e.shield} Premium Only`, value: config.premium ? "Yes" : "No",               inline: true },
        )
        .setFooter({ text: "!jr 1 ?on/?off | !jr ACTION ?set 2 | !jr X ?set 4a/4b" })
        .setTimestamp()] });
    }

    // ── Manually end raid mode ────────────────────────────
    if (slot === "off") {
      await JRModel.findOneAndUpdate({ guildId: guild.id }, { $set: { active: false, triggeredAt: null } });
      clearJoinTracker(guild.id);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${e.raidOff} Join raid mode deactivated.`)] });
    }

    // ── [1] Toggle ────────────────────────────────────────
    if (slot === "1" && (flag === "?on" || flag === "?off")) {
      return update("enabled", flag === "?on", `Join Raid turned **${flag === "?on" ? "ON" : "OFF"}**`);
    }

    // ── Premium toggle ────────────────────────────────────
    if (slot === "premium" && (flag === "?on" || flag === "?off")) {
      return update("premium", flag === "?on", `Premium-only restriction turned **${flag === "?on" ? "ON" : "OFF"}**`);
    }

    // ── [3] Warn roles ────────────────────────────────────
    if (value === "3") {
      const role = message.mentions.roles.first() ?? guild.roles.cache.get(slot);
      if (!role) return message.reply(`${e.error} Mention a role or provide a role ID.`);
      if (flag === "?add") {
        await JRModel.findOneAndUpdate({ guildId: guild.id }, { $addToSet: { warnRoles: role.id } });
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Added **${role.name}** as a warn role.`)] });
      }
      if (flag === "?remove") {
        await JRModel.findOneAndUpdate({ guildId: guild.id }, { $pull: { warnRoles: role.id } });
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Removed **${role.name}** from warn roles.`)] });
      }
    }

    // ── ?set slots ────────────────────────────────────────
    if (flag === "?set") {
      const action = slot;
      const num    = parseFloat(slot);

      if (value === "2") {
        if (!["timeout","kick","ban"].includes(action)) return message.reply(`${e.error} Action must be \`timeout\`, \`kick\`, or \`ban\`.`);
        return update("action", action, `Action set to \`${action}\``);
      }
      if (value === "4a") {
        if (isNaN(num) || num < 3 || num > 500) return message.reply(`${e.error} Threshold must be between 3 and 500.`);
        return update("threshold", num, `Trigger threshold set to \`${num}\` accounts`);
      }
      if (value === "4b") {
        if (isNaN(num) || num < 1 || num > 24) return message.reply(`${e.error} Window must be between 1 and 24 hours.`);
        return update("windowHours", num, `Window set to \`${num}h\``);
      }
    }

    return message.reply(`${e.error} Usage: \`!jr\` to view | \`!jr 1 ?on/?off\` | \`!jr <action> ?set 2\` | \`!jr X ?set 4a/4b\``);
  },
};

function canManage(message) {
  return message.member?.permissions.has("ManageGuild") || message.guild?.ownerId === message.author.id;
}
