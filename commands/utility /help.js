// ============================================================
//  commands/utility/help.js
//  Advanced paginated help command
//  - Loading animation before showing menu
//  - Dropdown to switch categories
//  - Prev/Home/Next buttons for pagination (8 cmds per page)
// ============================================================
const {
  EmbedBuilder, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e         = require("../../emojis/helpemoji");

const TIMEOUT  = 120_000;
const PER_PAGE = 8;

module.exports = {
  name: "help", description: "Browse all commands.", category: "utility",
  aliases: ["h", "commands"], usage: "", cooldown: 5,
  ownerOnly: false, devOnly: false, requiresDatabase: false, slash: false,

  slashData: new SlashCommandBuilder()
    .setName("help").setDescription("Browse all available commands.").toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const hidden = client.config.hiddenCategories.map(c => c.toLowerCase());

    // ── Build category map ─────────────────────────────
    const categories = new Map();
    for (const [, cmd] of client.commands) {
      const cat = (cmd.category || "general").toLowerCase();
      if (hidden.includes(cat)) continue;
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat).push(cmd);
    }

    if (!categories.size) return reply(ctx, {
      embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription("No commands available.")]
    });

    // ── Resolve prefix ─────────────────────────────────
    let prefix = client.config.prefix;
    try {
      const guildId = ctx.type === "prefix" ? ctx.message.guild?.id : ctx.interaction.guild?.id;
      if (guildId && client.db) {
        const guildDb = await client.db.getGuildDb(guildId);
        if (guildDb && !guildDb.isDown) {
          const { fromConnection } = require("../../models/GuildSettings");
          const GS = fromConnection(guildDb.connection);
          const s  = await GS.findOne({ guildId });
          if (s?.prefix) prefix = s.prefix;
        }
      }
    } catch {}

    // ── Loading embed ──────────────────────────────────
    const loadingEmbed = new EmbedBuilder()
      .setColor(0x7d5ba6)
      .setDescription(`${e.loading} **Loading help menu...**`);

    const sent = await reply(ctx, { embeds: [loadingEmbed] });
    const msg  = ctx.type === "prefix" ? sent : await ctx.interaction.fetchReply();
    await new Promise(r => setTimeout(r, 900));

    // ── State ──────────────────────────────────────────
    let currentCat  = "home";
    let currentPage = 0;

    // ── Small helpers ──────────────────────────────────
    const getCatEmoji = (cat) => e[cat.toLowerCase()] ?? e.default;
    const cap         = (s)   => s.charAt(0).toUpperCase() + s.slice(1);

    const getCatColor = (cat) => ({
      utility: 0x5865F2, moderation: 0xED4245, admin: 0xFEE75C,
      music: 0x1DB954, economy: 0xFFD700, leveling: 0x9C27B0,
      info: 0x00BCD4, giveaway: 0xFF6B9D, ticket: 0x4CAF50,
      modmail: 0x5865F2, verification: 0x8b5cf6, fun: 0xFF9800,
    }[cat] ?? 0x7d5ba6);

    const getPages = (cat) => {
      const cmds  = categories.get(cat) ?? [];
      const pages = [];
      for (let i = 0; i < cmds.length; i += PER_PAGE) pages.push(cmds.slice(i, i + PER_PAGE));
      return pages.length ? pages : [[]];
    };

    // ── Home embed ─────────────────────────────────────
    const buildHome = () => {
      const total   = [...categories.values()].reduce((a, c) => a + c.length, 0);
      const catList = [...categories.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cat, cmds]) => `${getCatEmoji(cat)} **${cap(cat)}** — \`${cmds.length} cmd${cmds.length === 1 ? "" : "s"}\``)
        .join("\n");

      return new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setAuthor({ name: `${client.user.username}`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setDescription(`> -# Click the dropdown below and select a category..\n\u200b`)
        .setFooter({ text: `Requested by ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
    };

    // ── Category embed ─────────────────────────────────
    const buildCatEmbed = (cat, page) => {
      const pages  = getPages(cat);
      const cmds   = pages[page] ?? [];
      const total  = categories.get(cat)?.length ?? 0;
      const maxPg  = pages.length;

      const lines = cmds.map(c => {
        const al  = c.aliases?.length ? ` (${c.aliases.map(a => `\`${a}\``).join(", ")})` : "";
        const dsc = (c.description || "No description.").slice(0, 80);
        return `\`${prefix}${c.name}\`${al}\n┗ ${dsc}`;
      }).join("\n\n") || "No commands.";

      return new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setAuthor({ name: `${cap(cat)} Commands`, iconURL: client.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(`> **${cap(cat)}** — Page ${page + 1}/${maxPg}\n\u200b`)
        .addFields({ name: `Commands [${total}]`, value: lines })
        .setFooter({ text: `Page ${page + 1}/${maxPg} • ${total} commands total`, iconURL: author.displayAvatarURL({ dynamic: true }) })
    };

    // ── Dropdown ───────────────────────────────────────
    const buildDropdown = () => new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("help_cat")
        .setPlaceholder("Select A Category")
        .addOptions([
          new StringSelectMenuOptionBuilder().setLabel("Home").setDescription("Return To Main Menu").setValue("home").setDefault(currentCat === "home"),
          ...[...categories.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, cmds]) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${cap(cat)}`)
                .setDescription(`${cmds.length} command${cmds.length === 1 ? "" : "s"}`)
                .setValue(cat)
                .setDefault(currentCat === cat)
            ),
        ])
    );

    // ── Page buttons ───────────────────────────────────
    const buildPageRow = (cat, page) => {
      const total = getPages(cat).length;
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("help_prev").setEmoji(e.prev).setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("help_home").setEmoji(e.home).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("help_next").setEmoji(e.next).setStyle(ButtonStyle.Secondary).setDisabled(page >= total - 1),
      );
    };

    // ── Render ─────────────────────────────────────────
    const render = () => {
      if (currentCat === "home") return { embeds: [buildHome()], components: [buildDropdown()] };
      const pages = getPages(currentCat);
      const rows  = [buildDropdown()];
      if (pages.length > 1) rows.push(buildPageRow(currentCat, currentPage));
      return { embeds: [buildCatEmbed(currentCat, currentPage)], components: rows };
    };

    await msg.edit(render());

    // ── Collector ──────────────────────────────────────
    const collector = msg.createMessageComponentCollector({
      filter: i => {
        if (i.user.id !== author.id) {
          i.reply({ content: "❌ This menu isn't for you!", ephemeral: true });
          return false;
        }
        return ["help_cat","help_prev","help_next","help_home"].includes(i.customId);
      },
      time: TIMEOUT,
    });

    collector.on("collect", async i => {
      await i.deferUpdate();
      if (i.customId === "help_cat") { currentCat = i.values[0]; currentPage = 0; }
      else if (i.customId === "help_prev") currentPage = Math.max(0, currentPage - 1);
      else if (i.customId === "help_next") currentPage = Math.min(getPages(currentCat).length - 1, currentPage + 1);
      else if (i.customId === "help_home") { currentCat = "home"; currentPage = 0; }
      await msg.edit(render());
    });

    collector.on("end", async () => {
      await msg.edit({
        components: [new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId("help_expired").setPlaceholder("⏱️ Expired — run !help again").setDisabled(true)
            .addOptions(new StringSelectMenuOptionBuilder().setLabel("Expired").setValue("expired"))
        )],
      }).catch(() => {});
    });
  },
};

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s % 60}s`);
  return parts.join(" ");
}
