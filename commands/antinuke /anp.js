// ============================================================
//  commands/antinuke/anp.js — Antinuke Panic settings
//  !anp @role ?set 5            — set panic ping role
//  !anp @role ?remove 5         — remove panic ping role
//  !anp category-id ?add 6      — whitelist category from antinuke
//  !anp category-id ?remove 6   — remove category whitelist
// ============================================================
const { EmbedBuilder } = require("discord.js");
const e = require("../../emojis/antinukeemoji");

module.exports = {
  name: "anp", description: "Configure antinuke panic settings.", category: "antinuke",
  aliases: ["antipanic", "anpanic"], usage: "<target> ?set/?add/?remove <slot>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb  = await client.db.getGuildDb(guild.id);
    const { fromConnection: AntiNukeConfig } = require("../../models/AntiNukeConfig");
    const flag  = ctx.args[1]?.toLowerCase();
    const slot  = ctx.args[2];
    const targetArg = ctx.args[0];

    // ── Slot 5 — Panic ping roles ─────────────────────────
    if (slot === "5") {
      const role = message.mentions.roles.first() ?? guild.roles.cache.get(targetArg);
      if (!role) return message.reply(`${e.error} Mention a role or provide a role ID.`);

      if (flag === "?set" || flag === "?add") {
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id }, { $addToSet: { panicPingRoles: role.id } }
        );
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
          .setDescription(`${e.success} **${role.name}** will be pinged when panic mode triggers.`)] });
      }
      if (flag === "?remove") {
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id }, { $pull: { panicPingRoles: role.id } }
        );
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
          .setDescription(`${e.success} Removed **${role.name}** from panic ping roles.`)] });
      }
    }

    // ── Slot 6 — Whitelisted categories ───────────────────
    if (slot === "6") {
      const catId = targetArg?.replace(/[<#>]/g, "");
      if (!catId) return message.reply(`${e.error} Provide a category ID.`);

      if (flag === "?add" || flag === "?set") {
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id }, { $addToSet: { whitelistedCategories: catId } }
        );
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
          .setDescription(`${e.success} Category \`${catId}\` whitelisted from antinuke (e.g. for ticket bots).`)] });
      }
      if (flag === "?remove") {
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id }, { $pull: { whitelistedCategories: catId } }
        );
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
          .setDescription(`${e.success} Removed category \`${catId}\` from whitelist.`)] });
      }
    }

    return message.reply(`${e.error} Usage:\n\`!anp @role ?set 5\` — set panic ping role\n\`!anp <categoryId> ?add 6\` — whitelist ticket category`);
  },
};

async function canManage(client, guild, userId) {
  if (guild.ownerId === userId) return true;
  if (userId === client.config.ownerID) return true;
  const guildDb = await client.db.getGuildDb(guild.id);
  if (!guildDb) return false;
  const { fromConnection: AntiNukePermit } = require("../../models/AntiNukePermit");
  const permit = await AntiNukePermit(guildDb.connection).findOne({ guildId: guild.id, userId }).lean();
  return !!permit;
}
