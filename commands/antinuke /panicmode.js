// ============================================================
//  commands/antinuke/panicmode.js
//  !panicmode ?on [reason]   — manually trigger panic mode
//  !panicmode ?off           — end panic mode
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { getConfig, triggerPanicMode, endPanicMode, isImmune } = require("../../utils/antiNukeUtils");
const e = require("../../emojis/antinukeemoji");

module.exports = {
  name: "panicmode", description: "Manually trigger or end panic mode.", category: "antinuke",
  aliases: ["panic", "pm"], usage: "?on/?off [reason]", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    // Only server owner + extra owners can trigger panic mode
    if (!await canTriggerPanic(client, guild, message.author.id)) return;

    const flag   = ctx.args[0]?.toLowerCase();
    const reason = ctx.args.slice(1).join(" ") || "Manually triggered";
    const config = await getConfig(client, guild.id);

    if (flag === "?on") {
      if (config?.panicMode?.active) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C)
          .setDescription(`${e.warning} Panic mode is already **active**! Use \`!panicmode ?off\` to end it.`)] });
      }

      const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setDescription(`${e.loading} Triggering panic mode...`)] });

      await triggerPanicMode(client, guild, reason, message.author.id);

      return msg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setTitle(`${e.panicOn} PANIC MODE ACTIVATED`)
        .setDescription(
          `${e.lockdown} All channels have been locked.\n` +
          `${e.permission} Dangerous permissions removed from all roles.\n\n` +
          `**Reason:** ${reason}\n` +
          `Use \`!panicmode ?off\` to end panic mode.`
        )
        .setTimestamp()] });
    }

    if (flag === "?off") {
      if (!config?.panicMode?.active) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C)
          .setDescription(`${e.info} Panic mode is not currently active.`)] });
      }

      const msg = await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2)
        .setDescription(`${e.loading} Ending panic mode...`)] });

      await endPanicMode(client, guild, message.author.id);

      return msg.edit({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setTitle(`${e.panicOff} Panic Mode Ended`)
        .setDescription(`${e.unlock} Channels have been unlocked.\nPanic mode has been deactivated.`)
        .setTimestamp()] });
    }

    return message.reply(`${e.error} Usage: \`!panicmode ?on [reason]\` or \`!panicmode ?off\``);
  },
};

async function canTriggerPanic(client, guild, userId) {
  if (guild.ownerId === userId) return true;
  if (userId === client.config.ownerID) return true;
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb) return false;
  const { fromConnection: AntiNukePermit } = require("../../models/AntiNukePermit");
  const permit = await AntiNukePermit(guildDb.connection).findOne({ guildId: guild.id, userId, level: "extra_owner" }).lean();
  return !!permit; // only extra owners + physical owner can trigger panic
}
