// ============================================================
//  commands/owner/np.js
//  No-prefix user management (Owner + Dev only)
//  Persists to data/nplist.json
// ============================================================
const {
  EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ButtonBuilder, ButtonStyle,
} = require("discord.js");
const { readJson, writeJson } = require("../../utils/dataUtils");

const PER_PAGE  = 5;
const DATA_FILE = "nplist.json";

module.exports = {
  name: "np", description: "Manage no-prefix users. (Owner/Dev only)",
  category: "dev", 
  aliases: ["noprefix"],
  usage: "<add|remove|list> [@user|id]",
  cooldown: 3,
  ownerOnly: false, 
  devOnly: false, 
  slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const userId  = message.author.id;

    // ── Owner + Dev only ──────────────────────────────
    const isOwner = userId === client.config.ownerID;
    const isDev   = Array.isArray(client.config.devIDs) && client.config.devIDs.includes(userId);
    if (!isOwner && !isDev) return;

    const sub    = ctx.args[0]?.toLowerCase();
    const target = message.mentions.users.first()
      ?? (ctx.args[1] ? { id: ctx.args[1], username: ctx.args[1] } : null);

    // ── ADD ───────────────────────────────────────────
    if (sub === "add") {
      if (!target) return message.reply("❌ Provide a user mention or ID.");

      const list = readJson(DATA_FILE);
      if (list.includes(target.id)) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`⚠️ \`${target.id}\` is already in the no-prefix list.`)] });
      }

      list.push(target.id);
      writeJson(DATA_FILE, list);
      client.config.noPrefix = list; // keep in-memory in sync

      const name = target.username ?? target.id;
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`✅ Added **${name}** (\`${target.id}\`) to no-prefix list.`)] });
    }

    // ── REMOVE ────────────────────────────────────────
    if (sub === "remove") {
      if (!target) return message.reply("❌ Provide a user mention or ID.");

      const list = readJson(DATA_FILE);
      const idx  = list.indexOf(target.id);
      if (idx === -1) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setDescription(`❌ \`${target.id}\` is not in the no-prefix list.`)] });
      }

      list.splice(idx, 1);
      writeJson(DATA_FILE, list);
      client.config.noPrefix = list;

      const name = target.username ?? target.id;
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`✅ Removed **${name}** (\`${target.id}\`) from no-prefix list.`)] });
    }

    // ── LIST ──────────────────────────────────────────
    if (!sub || sub === "list") {
      const list = readJson(DATA_FILE);

      if (!list.length) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
          .setTitle("📋 No-Prefix List")
          .setDescription("No users in the no-prefix list.")] });
      }

      const totalPages = Math.ceil(list.length / PER_PAGE);
      let   page       = 0;

      const buildEmbed = async (pg) => {
        const slice = list.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);
        const lines = await Promise.all(slice.map(async (id, i) => {
          const user = await client.users.fetch(id).catch(() => null);
          const name = user ? `${user.tag}` : "Unknown User";
          return `\`${pg * PER_PAGE + i + 1}.\` **${name}** — \`${id}\``;
        }));
        return new EmbedBuilder()
          .setColor(0x4A3F5F)
          .setTitle("📋 No-Prefix List")
          .setDescription(lines.join("\n") || "Empty page.")
          .setFooter({ text: `Page ${pg + 1}/${totalPages} • ${list.length} total` });
      };

      const buildDropdown = (pg) => new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`np_page_${message.id}`)
          .setPlaceholder(`Page ${pg + 1}/${totalPages}`)
          .addOptions(Array.from({ length: totalPages }, (_, i) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`Page ${i + 1}`)
              .setDescription(`IDs ${i * PER_PAGE + 1}–${Math.min((i + 1) * PER_PAGE, list.length)}`)
              .setValue(`${i}`)
              .setDefault(i === pg)
          ))
      );

      const buildButtons = (pg) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("np_prev").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
        new ButtonBuilder().setCustomId("np_next").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(pg >= totalPages - 1),
      );

      const getComponents = (pg) => totalPages > 1 ? [buildDropdown(pg), buildButtons(pg)] : [];

      const msg = await message.reply({
        embeds:     [await buildEmbed(page)],
        components: getComponents(page),
      });

      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        filter: i => {
          if (i.user.id !== message.author.id) { i.reply({ content: "❌ Not for you!", ephemeral: true }); return false; }
          return [`np_page_${message.id}`, "np_prev", "np_next"].includes(i.customId);
        },
        time: 60_000,
      });

      collector.on("collect", async i => {
        await i.deferUpdate();
        if (i.customId === `np_page_${message.id}`) page = parseInt(i.values[0]);
        else if (i.customId === "np_prev") page = Math.max(0, page - 1);
        else if (i.customId === "np_next") page = Math.min(totalPages - 1, page + 1);
        await msg.edit({ embeds: [await buildEmbed(page)], components: getComponents(page) });
      });

      collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    return message.reply("❌ Usage: `!np <add|remove|list> [@user|id]`");
  },
};
