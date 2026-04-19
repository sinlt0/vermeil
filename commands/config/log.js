
const {
  EmbedBuilder, PermissionFlagsBits,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require("discord.js");
const {
  CATEGORY_META, ALL_CATEGORIES,
  ensureLogConfig, setCategoryChannel,
  toggleCategory, getLogConfig,
} = require("../../utils/logUtils");

const CHANNEL_NAMES = {
  mod:      "📜-mod-logs",
  antinuke: "🛡️-antinuke-logs",
  automod:  "🤖-automod-logs",
  member:   "👤-member-logs",
  message:  "💬-message-logs",
  server:   "⚙️-server-logs",
  voice:    "🔊-voice-logs",
  invite:   "🔗-invite-logs",
  thread:   "🧵-thread-logs",
  webhook:  "🪝-webhook-logs",
  emoji:    "😀-emoji-logs",
  boost:    "💎-boost-logs",
};

module.exports = {
  name: "log", 
 description: "Manage the server logging system.",     category: "config",
 aliases: ["logs", "logging"], usage: "<setup|aio|view|enable|disable|<category>> [set|#channel]",
  cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;

    const sub     = ctx.args[0]?.toLowerCase();
    const sub2    = ctx.args[1]?.toLowerCase();
    const channel = message.mentions.channels.first()
      ?? (ctx.args[2] ? guild.channels.cache.get(ctx.args[2]) : null)
      ?? (ctx.args[1] ? guild.channels.cache.get(ctx.args[1]) : null);

    const config = await ensureLogConfig(client, guild.id);

    // ── VIEW (no args) ────────────────────────────────────
    if (!sub || sub === "view") {
      const lines = ALL_CATEGORIES.map(cat => {
        const meta  = CATEGORY_META[cat];
        const entry = config.categories?.[cat];
        const ch    = entry?.channelId ? guild.channels.cache.get(entry.channelId) : null;
        const status = entry?.enabled !== false ? "🟢" : "🔴";
        return `${status} ${meta.emoji} **${meta.label}** — ${ch ? `${ch}` : "`Not set`"}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Log Settings — ${guild.name}`)
        .setDescription(lines.join("\n"))
        .addFields({
          name: "ℹ️ Commands",
          value:
            `\`!log setup\` — auto-create all log channels\n` +
            `\`!log aio set #channel\` — all logs in one channel\n` +
            `\`!log <category> set #channel\` — set specific channel\n` +
            `\`!log enable/disable [category]\` — toggle categories`,
        })
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── SETUP ─────────────────────────────────────────────
    if (sub === "setup") {
      const msg = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription("⏳ Creating log category and channels...")] });

      const steps = [];

      // Create category
      let category;
      try {
        category = await guild.channels.create({
          name:   "📋 Server Logs",
          type:   4, // category
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageWebhooks] },
          ],
          reason: "Log system setup",
        });
        steps.push(`✅ Created category **📋 Server Logs**`);
      } catch {
        steps.push(`❌ Failed to create category`);
      }

      // Create channel per category
      for (const cat of ALL_CATEGORIES) {
        try {
          const ch = await guild.channels.create({
            name:     CHANNEL_NAMES[cat],
            type:     0, // text
            parent:   category?.id ?? null,
            permissionOverwrites: category ? [] : [
              { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
              { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageWebhooks] },
            ],
            reason: "Log system setup",
          });

          const result = await setCategoryChannel(client, guild, cat, ch);
          const wh     = result.hasWebhook ? " *(webhook created)*" : "";
          steps.push(`✅ ${CATEGORY_META[cat].emoji} **${CATEGORY_META[cat].label}** → ${ch}${wh}`);
        } catch (err) {
          steps.push(`❌ Failed to create **${CATEGORY_META[cat].label}**: ${err.message}`);
        }
      }

      // Chunk steps into fields (max 1024 chars)
      const fields = [];
      let   chunk  = "";
      for (const step of steps) {
        if (chunk.length + step.length + 1 > 1024) {
          fields.push({ name: "\u200b", value: chunk });
          chunk = step;
        } else {
          chunk += (chunk ? "\n" : "") + step;
        }
      }
      if (chunk) fields.push({ name: "\u200b", value: chunk });

      return msg.edit({ embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("✅ Log System Setup Complete!")
        .addFields(...fields)
        .setTimestamp()] });
    }

    // ── AIO SET ───────────────────────────────────────────
    if (sub === "aio" && sub2 === "set") {
      if (!channel) return message.reply("❌ Mention a channel. Usage: `!log aio set #channel`");

      const msg = await message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x5865F2).setDescription(`⏳ Setting all log categories to ${channel}...`)] });

      let success = 0, failed = 0;
      for (const cat of ALL_CATEGORIES) {
        const result = await setCategoryChannel(client, guild, cat, channel);
        if (result.success) success++;
        else failed++;
      }

      return msg.edit({ embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(
          `✅ Set **${success}** categories to ${channel}.\n` +
          (failed ? `❌ **${failed}** failed (check bot permissions).` : "")
        )
        .setTimestamp()] });
    }

    // ── ENABLE ────────────────────────────────────────────
    if (sub === "enable") {
      const cat = sub2;
      if (cat && !ALL_CATEGORIES.includes(cat)) {
        return message.reply(`❌ Invalid category. Valid: \`${ALL_CATEGORIES.join(", ")}\``);
      }

      const cats = cat ? [cat] : ALL_CATEGORIES;
      for (const c of cats) await toggleCategory(client, guild.id, c, true);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`🟢 **${cat ? CATEGORY_META[cat].label : "All categories"}** enabled.`)] });
    }

    // ── DISABLE ───────────────────────────────────────────
    if (sub === "disable") {
      const cat = sub2;
      if (cat && !ALL_CATEGORIES.includes(cat)) {
        return message.reply(`❌ Invalid category. Valid: \`${ALL_CATEGORIES.join(", ")}\``);
      }

      const cats = cat ? [cat] : ALL_CATEGORIES;
      for (const c of cats) await toggleCategory(client, guild.id, c, false);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setDescription(`🔴 **${cat ? CATEGORY_META[cat].label : "All categories"}** disabled.`)] });
    }

    // ── CATEGORY SET ──────────────────────────────────────
    if (ALL_CATEGORIES.includes(sub) && sub2 === "set") {
      if (!channel) return message.reply(`❌ Mention a channel. Usage: \`!log ${sub} set #channel\``);

      const result = await setCategoryChannel(client, guild, sub, channel);
      if (!result.success) return message.reply(`❌ ${result.reason}`);

      const meta = CATEGORY_META[sub];
      return message.reply({ embeds: [new EmbedBuilder().setColor(meta.color)
        .setDescription(
          `✅ **${meta.emoji} ${meta.label}** will be sent to ${channel}.\n` +
          (result.hasWebhook ? "🪝 Webhook created." : "⚠️ Could not create webhook — sending directly.")
        )] });
    }

    return message.reply(
      `❌ Unknown subcommand. Usage:\n` +
      `\`!log setup\` | \`!log aio set #ch\` | \`!log <category> set #ch\`\n` +
      `\`!log enable/disable [category]\` | \`!log view\`\n` +
      `**Categories:** \`${ALL_CATEGORIES.join(", ")}\``
    );
  },
};
