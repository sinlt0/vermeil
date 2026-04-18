// ============================================================
//  commands/owner/premium.js
//  Premium management — Owner + Dev only
//  Exception: premium info can be used by server admins
//
//  Subcommands:
//    !premium add <guildId> <duration>
//    !premium remove <guildId>
//    !premium info [guildId]   ← admins can use without guildId
//    !premium list [all|active|expired]
// ============================================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require("discord.js");
const { fromConnection }    = require("../../models/Premium");
const {
  getDurationMs, getDurationChoices,
  formatExpiry, isPremium,
}                           = require("../../utils/premiumUtils");

const PER_PAGE = 10;

module.exports = {
  name:        "premium",
  description: "Manage server premium. (Owner/Dev only)",
  category:    "dev",
  aliases:     ["prem"],
  usage:       "<add|remove|info|list>",
  cooldown:    3,
  ownerOnly:   false,
  devOnly:     false,
  slash:       false,

  async execute(client, ctx) {
    const message = ctx.message;
    const userId  = message.author.id;

    const isOwner = userId === client.config.ownerID;
    const isDev   = Array.isArray(client.config.devIDs) && client.config.devIDs.includes(userId);
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);

    const sub = ctx.args[0]?.toLowerCase();

    // ── INFO — server admins can check their own server ──
    if (sub === "info") {
      if (!isOwner && !isDev && !isAdmin) return;

      // Admins can only check their own guild
      // Owner/Dev can check any guild by ID
      let guildId   = message.guild.id;
      let guildName = message.guild.name;

      if ((isOwner || isDev) && ctx.args[1]) {
        guildId   = ctx.args[1];
        const g   = client.guilds.cache.get(guildId);
        guildName = g?.name ?? `Unknown (${guildId})`;
      }

      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
          .setDescription("❌ Could not access database for that guild.")] });
      }

      const PremiumModel = fromConnection(guildDb.connection);
      const record       = await PremiumModel.findOne({ guildId }).lean();

      if (!record) {
        return message.reply({ embeds: [new EmbedBuilder()
          .setColor(0x99AAB5)
          .setTitle(`✨ Premium Status — ${guildName}`)
          .setDescription("This server does **not** have Premium.")
          .setTimestamp()] });
      }

      const isActive = record.active &&
        (record.lifetime || !record.expiresAt || new Date(record.expiresAt) > new Date());

      const embed = new EmbedBuilder()
        .setColor(isActive ? 0xFFD700 : 0xED4245)
        .setTitle(`✨ Premium Status — ${guildName}`)
        .addFields(
          { name: "Status",     value: isActive ? "✅ Active" : "❌ Expired",                         inline: true },
          { name: "Duration",   value: record.duration ?? "Unknown",                                   inline: true },
          { name: "Type",       value: record.lifetime ? "♾️ Lifetime" : "📅 Time-limited",            inline: true },
          { name: "Started",    value: record.startedAt ? `<t:${Math.floor(new Date(record.startedAt).getTime()/1000)}:D>` : "Unknown", inline: true },
          { name: "Expires",    value: record.lifetime ? "Never" : (record.expiresAt ? `<t:${Math.floor(new Date(record.expiresAt).getTime()/1000)}:R>` : "Unknown"), inline: true },
          { name: "Granted By", value: record.grantedBy ? `<@${record.grantedBy}>` : "Unknown",       inline: true },
          { name: "Time Left",  value: formatExpiry(record.expiresAt, record.lifetime),               inline: false },
        )
        .setFooter({ text: `Guild ID: ${guildId}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── All other subcommands — Owner + Dev only ──────────
    if (!isOwner && !isDev) return;

    // ── ADD ───────────────────────────────────────────────
    if (sub === "add") {
      const guildId  = ctx.args[1];
      const durLabel = ctx.args.slice(2).join(" ").toLowerCase();

      if (!guildId) return message.reply(`❌ Usage: \`!premium add <guildId> <duration>\`\nDurations: ${getDurationChoices().join(", ")}`);
      if (!durLabel) return message.reply(`❌ Provide a duration: ${getDurationChoices().join(", ")}`);
      if (!getDurationChoices().includes(durLabel)) return message.reply(`❌ Invalid duration. Options: \`${getDurationChoices().join(", ")}\``);

      const guild = client.guilds.cache.get(guildId);
      if (!guild) return message.reply(`❌ Bot is not in guild \`${guildId}\`.`);

      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) return message.reply("❌ Could not access database for that guild.");

      const PremiumModel = fromConnection(guildDb.connection);
      const isLifetime   = durLabel === "lifetime";
      const durationMs   = getDurationMs(durLabel);
      const expiresAt    = isLifetime ? null : new Date(Date.now() + durationMs);

      await PremiumModel.findOneAndUpdate(
        { guildId },
        {
          $set: {
            guildId,
            guildName:  guild.name,
            active:     true,
            lifetime:   isLifetime,
            startedAt:  new Date(),
            expiresAt,
            duration:   durLabel,
            grantedBy:  userId,
            warnedAt:   null,
          },
        },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle("✨ Premium Granted")
        .addFields(
          { name: "Guild",    value: `${guild.name} (\`${guildId}\`)`, inline: true },
          { name: "Duration", value: durLabel,                         inline: true },
          { name: "Expires",  value: isLifetime ? "Never" : `<t:${Math.floor(expiresAt.getTime()/1000)}:R>`, inline: true },
        )
        .setTimestamp();

      // DM the server owner
      const owner = await guild.fetchOwner().catch(() => null);
      if (owner) {
        await owner.user.send({
          embeds: [new EmbedBuilder()
            .setColor(0xFFD700)
            .setTitle("✨ Premium Activated!")
            .setDescription(
              `Your server **${guild.name}** has been granted **Premium**!\n\n` +
              `**Duration:** ${durLabel}\n` +
              `**Expires:** ${isLifetime ? "Never (Lifetime)" : `<t:${Math.floor(expiresAt.getTime()/1000)}:R>`}\n\n` +
              `Enjoy all premium features!`
            )
            .setTimestamp()],
        }).catch(() => {});
      }

      return message.reply({ embeds: [embed] });
    }

    // ── REMOVE ────────────────────────────────────────────
    if (sub === "remove") {
      const guildId = ctx.args[1];
      if (!guildId) return message.reply("❌ Usage: `!premium remove <guildId>`");

      const guild   = client.guilds.cache.get(guildId);
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) return message.reply("❌ Could not access database for that guild.");

      const PremiumModel = fromConnection(guildDb.connection);
      const record       = await PremiumModel.findOne({ guildId });

      if (!record) return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setDescription(`❌ Guild \`${guildId}\` does not have Premium.`)] });

      await PremiumModel.findOneAndUpdate({ guildId }, { $set: { active: false } });

      // DM the server owner
      if (guild) {
        const owner = await guild.fetchOwner().catch(() => null);
        if (owner) {
          await owner.user.send({
            embeds: [new EmbedBuilder()
              .setColor(0xED4245)
              .setTitle("❌ Premium Removed")
              .setDescription(`Premium has been **removed** from **${guild.name}**.\nContact the bot owner for more information.`)
              .setTimestamp()],
          }).catch(() => {});
        }
      }

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`✅ Premium removed from **${guild?.name ?? guildId}**.`)] });
    }

    // ── LIST ──────────────────────────────────────────────
    if (!sub || sub === "list") {
      const filter = ctx.args[1]?.toLowerCase() ?? "all";
      if (!["all", "active", "expired"].includes(filter)) {
        return message.reply("❌ Filter must be `all`, `active`, or `expired`.");
      }

      // Collect premium records across all cached guilds
      const records = [];

      for (const [guildId, guild] of client.guilds.cache) {
        try {
          const guildDb = await client.db.getGuildDb(guildId);
          if (!guildDb || guildDb.isDown) continue;

          const PremiumModel = fromConnection(guildDb.connection);
          const record       = await PremiumModel.findOne({ guildId }).lean();
          if (!record) continue;

          const isActive = record.active &&
            (record.lifetime || !record.expiresAt || new Date(record.expiresAt) > new Date());

          if (filter === "active"  && !isActive) continue;
          if (filter === "expired" &&  isActive) continue;

          records.push({ ...record, guildName: guild?.name ?? record.guildName ?? guildId, isActive });
        } catch {}
      }

      if (!records.length) {
        return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2)
          .setTitle(`✨ Premium List — ${cap(filter)}`)
          .setDescription("No premium records found.")] });
      }

      // Sort active first, then by expiry
      records.sort((a, b) => {
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (!a.expiresAt) return -1;
        if (!b.expiresAt) return 1;
        return new Date(a.expiresAt) - new Date(b.expiresAt);
      });

      const totalPages = Math.ceil(records.length / PER_PAGE);
      let   page       = 0;

      const buildEmbed = (pg) => {
        const slice = records.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);
        const lines = slice.map((r, i) => {
          const idx      = pg * PER_PAGE + i + 1;
          const status   = r.isActive ? "✅" : "❌";
          const expiry   = r.lifetime ? "♾️ Lifetime" : (r.expiresAt ? `<t:${Math.floor(new Date(r.expiresAt).getTime()/1000)}:R>` : "?");
          return `\`${idx}.\` ${status} **${r.guildName}**\n┣ ID: \`${r.guildId}\`\n┗ ${expiry} • ${r.duration ?? "?"}`;
        });

        return new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(`✨ Premium List — ${cap(filter)}`)
          .setDescription(lines.join("\n\n") || "Empty page.")
          .setFooter({ text: `Page ${pg + 1}/${totalPages} • ${records.length} total` })
          .setTimestamp();
      };

      const buildDropdown = (pg) => new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`prem_page_${message.id}`)
          .setPlaceholder(`Page ${pg + 1}/${totalPages}`)
          .addOptions(Array.from({ length: totalPages }, (_, i) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`Page ${i + 1}`)
              .setDescription(`Records ${i * PER_PAGE + 1}–${Math.min((i + 1) * PER_PAGE, records.length)}`)
              .setValue(`${i}`)
              .setDefault(i === pg)
          ))
      );

      const buildButtons = (pg) => new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prem_prev").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
        new ButtonBuilder().setCustomId("prem_next").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(pg >= totalPages - 1),
      );

      const getComponents = (pg) => totalPages > 1 ? [buildDropdown(pg), buildButtons(pg)] : [];

      const msg = await message.reply({
        embeds:     [buildEmbed(page)],
        components: getComponents(page),
      });

      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        filter: i => {
          if (i.user.id !== message.author.id) { i.reply({ content: "❌ Not for you!", ephemeral: true }); return false; }
          return [`prem_page_${message.id}`, "prem_prev", "prem_next"].includes(i.customId);
        },
        time: 60_000,
      });

      collector.on("collect", async i => {
        await i.deferUpdate();
        if (i.customId === `prem_page_${message.id}`) page = parseInt(i.values[0]);
        else if (i.customId === "prem_prev") page = Math.max(0, page - 1);
        else if (i.customId === "prem_next") page = Math.min(totalPages - 1, page + 1);
        await msg.edit({ embeds: [buildEmbed(page)], components: getComponents(page) });
      });

      collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    return message.reply("❌ Usage: `!premium <add|remove|info|list>`");
  },
};

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
