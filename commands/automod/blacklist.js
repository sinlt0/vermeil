// ============================================================
//  commands/automod/blacklist.js  (alias: !bl)
//  !blacklist word add <word>      — add word (exact)
//  !blacklist word add * <word>    — add wildcard word
//  !blacklist word remove <word>   — remove word
//  !blacklist word list            — list words (paginated)
//  !blacklist link add <link>      — add blacklisted link
//  !blacklist link remove <link>   — remove link
//  !blacklist link list            — list links (paginated)
// ============================================================
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { fromConnection: BlacklistedWord } = require("../../models/BlacklistedWord");
const { fromConnection: BlacklistedLink } = require("../../models/BlacklistedLink");
const { normalizeLink } = require("../../utils/automod/linkScanner");
const e = require("../../emojis/automodemoji");

const PER_PAGE = 10;

module.exports = {
  name: "blacklist", description: "Manage word and link blacklists.", category: "automod",
  aliases: ["bl"], usage: "<word|link> <add|remove|list> [value]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    if (!canManage(message)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return message.reply(`${e.error} Database unavailable.`);

    const type = ctx.args[0]?.toLowerCase();
    const sub  = ctx.args[1]?.toLowerCase();

    if (!["word","link"].includes(type)) {
      return message.reply(`${e.error} Usage: \`!blacklist word/link add/remove/list [value]\``);
    }

    const Model = type === "word"
      ? BlacklistedWord(guildDb.connection)
      : BlacklistedLink(guildDb.connection);

    // ── ADD ───────────────────────────────────────────────
    if (sub === "add") {
      let entry = ctx.args.slice(2).join(" ").trim();
      if (!entry) return message.reply(`${e.error} Provide a ${type} to blacklist.`);

      if (type === "word") {
        const isWildcard = entry.startsWith("*") || entry.endsWith("*") || entry.includes("*");
        const wordType   = isWildcard ? "wildcard" : "exact";
        const clean      = entry.toLowerCase();

        const existing = await Model.findOne({ guildId: guild.id, word: clean });
        if (existing) return message.reply(`${e.warning} \`${clean}\` is already blacklisted.`);

        await Model.create({ guildId: guild.id, word: clean, type: wordType, addedBy: message.author.id });
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Added **${clean}** to the word blacklist. (${wordType === "wildcard" ? e.wildcard + " wildcard" : e.exact + " exact"})`)] });
      }

      if (type === "link") {
        const normalized = normalizeLink(entry);
        const existing   = await Model.findOne({ guildId: guild.id, link: normalized });
        if (existing) return message.reply(`${e.warning} \`${normalized}\` is already blacklisted.`);

        await Model.create({ guildId: guild.id, link: normalized, addedBy: message.author.id });
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`${e.success} Added **${normalized}** to the link blacklist.`)] });
      }
    }

    // ── REMOVE ────────────────────────────────────────────
    if (sub === "remove") {
      const entry = ctx.args.slice(2).join(" ").trim().toLowerCase();
      if (!entry) return message.reply(`${e.error} Provide a ${type} to remove.`);

      const field  = type === "word" ? "word" : "link";
      const value  = type === "link" ? normalizeLink(entry) : entry;
      const deleted = await Model.findOneAndDelete({ guildId: guild.id, [field]: value });

      if (!deleted) return message.reply(`${e.error} \`${value}\` is not in the blacklist.`);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${e.success} Removed **${value}** from the blacklist.`)] });
    }

    // ── LIST ──────────────────────────────────────────────
    if (!sub || sub === "list") {
      const entries = await Model.find({ guildId: guild.id }).lean();
      if (!entries.length) return message.reply(`${e.info} No ${type}s blacklisted yet.`);

      const totalPages = Math.ceil(entries.length / PER_PAGE);
      let   page       = 0;

      const buildEmbed = (pg) => {
        const slice = entries.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);
        const lines = slice.map((entry, i) => {
          const val   = type === "word" ? entry.word : entry.link;
          const tag   = type === "word" ? (entry.type === "wildcard" ? `${e.wildcard}` : `${e.exact}`) : e.linkBL;
          return `\`${pg * PER_PAGE + i + 1}.\` ${tag} \`${val}\``;
        });
        return new EmbedBuilder()
          .setColor(0x4A3F5F)
          .setTitle(`${e.blacklist} Blacklisted ${type === "word" ? "Words" : "Links"} — ${guild.name}`)
          .setDescription(lines.join("\n"))
          .setFooter({ text: `Page ${pg + 1}/${totalPages} • ${entries.length} total` });
      };

      const getComponents = (pg) => {
        if (totalPages <= 1) return [];
        return [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`bl_page_${message.id}`)
              .setPlaceholder(`Page ${pg + 1}/${totalPages}`)
              .addOptions(Array.from({ length: totalPages }, (_, i) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(`Page ${i + 1}`)
                  .setDescription(`Items ${i * PER_PAGE + 1}–${Math.min((i + 1) * PER_PAGE, entries.length)}`)
                  .setValue(`${i}`).setDefault(i === pg)
              ))
          ),
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("bl_prev").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
            new ButtonBuilder().setCustomId("bl_next").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(pg >= totalPages - 1),
          ),
        ];
      };

      const msg = await message.reply({ embeds: [buildEmbed(page)], components: getComponents(page) });
      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        filter: i => { if (i.user.id !== message.author.id) { i.reply({ content: "❌", ephemeral: true }); return false; } return true; },
        time: 60_000,
      });
      collector.on("collect", async i => {
        await i.deferUpdate();
        if (i.customId === `bl_page_${message.id}`) page = parseInt(i.values[0]);
        else if (i.customId === "bl_prev") page = Math.max(0, page - 1);
        else if (i.customId === "bl_next") page = Math.min(totalPages - 1, page + 1);
        await msg.edit({ embeds: [buildEmbed(page)], components: getComponents(page) });
      });
      collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
    }
  },
};

function canManage(message) {
  return message.member?.permissions.has("ManageGuild") || message.guild?.ownerId === message.author.id;
}
