// ============================================================
//  commands/antinuke/antinuke.js  (alias: !an)
//  View and toggle antinuke filters + set limits
//
//  !antinuke                    — view all filters
//  !antinuke <n> ?on/?off       — toggle filter
//  !antinuke <n> ?limit <num>   — set threshold
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ensureConfig } = require("../../utils/antiNukeUtils");
const e = require("../../emojis/antinukeemoji");

const FILTERS = {
  "1":  { key: null,                          label: "Master Toggle",             desc: "Enable/disable the entire antinuke system" },
  "2":  { key: "massChannel",                 label: "Mass Channel Delete/Create",desc: "Quarantine admins mass-creating or deleting channels" },
  "3":  { key: "massRole",                    label: "Mass Role Delete/Create",   desc: "Quarantine admins mass-creating or deleting roles" },
  "4a": { key: "pruneProtection",             label: "Prune Protection",          desc: "Detects malicious member pruning" },
  "4b": { key: "quarantineHold",              label: "Quarantine Hold",           desc: "Quarantine anyone who touches a quarantined member" },
  "5a": { key: "massBanKick",                 label: "Mass Ban/Kick",             desc: "Quarantine admins mass-banning or kicking" },
  "5b": { key: "strictMode",                  label: "Strict Mode",               desc: "Quarantine anyone adding dangerous perms to ANY role" },
  "5c": { key: "monitorPublicRoles",          label: "Monitor Public Roles",      desc: "Protect @everyone and main roles from perm changes" },
  "6":  { key: "monitorChannelPerms",         label: "Monitor Channel Perms",     desc: "Watch channel permission overrides" },
  "7":  { key: "massWebhook",                 label: "Mass Webhook",              desc: "Detect mass webhook creation/deletion" },
  "8":  { key: "massEmoji",                   label: "Mass Emoji",                desc: "Detect mass emoji creation/deletion" },
};

const HAS_LIMIT = ["2","3","5a","7","8"];

module.exports = {
  name: "antinuke", description: "View and configure antinuke filters.", category: "antinuke",
  aliases: ["an"], usage: "[filter] [?on/?off] [?limit <n>]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const config  = await ensureConfig(client, guild.id);
    const filterId = ctx.args[0]?.toLowerCase();
    const flag     = ctx.args[1]?.toLowerCase();
    const value    = ctx.args[2];

    // ── View all filters ──────────────────────────────────
    if (!filterId) {
      const lines = Object.entries(FILTERS).map(([id, f]) => {
        let status;
        if (id === "1") {
          status = config.enabled ? e.on : e.off;
        } else {
          status = config.filters[f.key]?.enabled ? e.on : e.off;
        }
        const limit = HAS_LIMIT.includes(id) && config.filters[f.key]?.limit
          ? ` (limit: ${config.filters[f.key].limit})`
          : "";
        return `${status} \`${id}\` **${f.label}**${limit}\n┗ ${f.desc}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.shield} Antinuke Configuration — ${guild.name}`)
        .setDescription(lines.join("\n\n"))
        .addFields(
          { name: `${e.info} Usage`, value: `\`!an <id> ?on/?off\` — toggle\n\`!an <id> ?limit <n>\` — set threshold` }
        )
        .setFooter({ text: `Quarantine Role: ${config.quarantineRoleId ? "✅ Set" : "❌ Not set"} • Log Channel: ${config.logChannelId ? "✅ Set" : "❌ Not set"}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // Validate filter ID
    if (!FILTERS[filterId]) return message.reply(`${e.error} Invalid filter ID. Use \`!antinuke\` to see all filters.`);

    const filter = FILTERS[filterId];
    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: AntiNukeConfig } = require("../../models/AntiNukeConfig");

    // ── Toggle on/off ─────────────────────────────────────
    if (flag === "?on" || flag === "?off") {
      const newVal = flag === "?on";

      if (filterId === "1") {
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id },
          { $set: { enabled: newVal } }
        );
      } else {
        await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
          { guildId: guild.id },
          { $set: { [`filters.${filter.key}.enabled`]: newVal } }
        );
      }

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setDescription(`${newVal ? e.on : e.off} **${filter.label}** has been turned **${newVal ? "ON" : "OFF"}**.`)] });
    }

    // ── Set limit ─────────────────────────────────────────
    if (flag === "?limit") {
      if (!HAS_LIMIT.includes(filterId)) return message.reply(`${e.error} This filter doesn't support a limit.`);

      const num = parseInt(value);
      if (!num || num < 1 || num > 100) return message.reply(`${e.error} Limit must be between 1 and 100.`);

      await AntiNukeConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`filters.${filter.key}.limit`]: num } }
      );

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setDescription(`${e.limit} **${filter.label}** limit set to **${num}** actions.`)] });
    }

    // Show filter info
    const status = filterId === "1"
      ? (config.enabled ? e.on : e.off)
      : (config.filters[filter.key]?.enabled ? e.on : e.off);

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.shield} Filter ${filterId} — ${filter.label}`)
      .setDescription(filter.desc)
      .addFields(
        { name: "Status", value: `${status} ${config.filters[filter.key]?.enabled ? "Enabled" : "Disabled"}`, inline: true },
        ...(HAS_LIMIT.includes(filterId) ? [{ name: "Limit", value: `${config.filters[filter.key]?.limit ?? "N/A"}`, inline: true }] : []),
      )
      .setFooter({ text: "!an <id> ?on/?off | !an <id> ?limit <n>" });

    return message.reply({ embeds: [embed] });
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
