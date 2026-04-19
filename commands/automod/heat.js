// ============================================================
//  commands/automod/heat.js  (alias: !h)
//  View and configure the heat system
//
//  !heat                  — view all settings
//  !heat 1 ?off/?on       — master toggle
//  !heat 2 ?on/?off       — toggle anti-spam filters
//  !heat X ?set 3         — set max heat %
//  !heat X ?set 4         — set degradation rate (% per second)
//  !heat X ?set 5         — set regular strike timeout (seconds)
//  !heat X ?set 6         — set cap strike timeout (seconds)
//  !heat X ?set 7         — set cap count (strikes before cap)
//  !heat X ?set 8         — set multiplier
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ensureConfig }  = require("../../utils/automod/automodUtils");
const { heatBar }       = require("../../utils/automod/heatEngine");
const e = require("../../emojis/automodemoji");

module.exports = {
  name: "heat", description: "Configure the automod heat system.", category: "automod",
  aliases: ["automod", "am"], usage: "[slot] [?on/?off/?set] [value]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    if (!await canManage(message)) return;

    const config  = await ensureConfig(client, guild.id);
    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: AutoModConfig } = require("../../models/AutoModConfig");

    const slot  = ctx.args[0]?.toLowerCase();
    const flag  = ctx.args[1]?.toLowerCase();
    const value = ctx.args[2] ?? ctx.args[1];

    // ── VIEW all settings ─────────────────────────────────
    if (!slot) {
      const h = config.heat;
      const f = config.filters;

      const embed = new EmbedBuilder()
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setTitle(`${e.heat} Heat / AutoMod Settings — ${guild.name}`)
        .addFields(
          { name: `${config.enabled ? e.on : e.off} [1] Master Toggle`,
            value: config.enabled ? "**Enabled**" : "**Disabled**", inline: true },
          { name: `${f.antiSpam ? e.on : e.off} [2] Anti-Spam`,
            value: f.antiSpam ? "Enabled" : "Disabled", inline: true },
          { name: "\u200b", value: "\u200b", inline: true },
          { name: `${e.percent} [3] Max Heat`,
            value: `\`${h.maxPercent}%\``, inline: true },
          { name: `${e.degradation} [4] Degradation`,
            value: `\`${h.degradationRate}%/s\``, inline: true },
          { name: `${e.strike} [5] Strike Timeout`,
            value: `\`${formatDuration(h.strikeTimeout)}\``, inline: true },
          { name: `${e.cap} [6] Cap Timeout`,
            value: `\`${formatDuration(h.capTimeout)}\``, inline: true },
          { name: `${e.warning} [7] Cap Count`,
            value: `\`${h.capCount} strikes\``, inline: true },
          { name: `${e.multiplier} [8] Multiplier`,
            value: `\`${h.multiplier}x\``, inline: true },
          { name: `${e.spam} Anti-Spam Sub-Filters`,
            value: [
              `${f.normalMessage    ? e.on : e.off} Normal Messages`,
              `${f.similarMessage   ? e.on : e.off} Similar/Repeated`,
              `${f.emojiSpam        ? e.on : e.off} Emoji Spam`,
              `${f.messageChars     ? e.on : e.off} Wall of Text`,
              `${f.newLines         ? e.on : e.off} Excessive New Lines`,
              `${f.inactiveChannel  ? e.on : e.off} Inactive Channel`,
              `${f.mentions         ? e.on : e.off} Mention Spam`,
              `${f.attachments      ? e.on : e.off} Attachment Spam`,
            ].join("\n"), inline: false },
          { name: `${e.invite} Other Filters`,
            value: [
              `${f.inviteLinks     ? e.on : e.off} Invite Links (Action: ${f.inviteAction})`,
              `${f.maliciousLinks  ? e.on : e.off} Malicious Links (Action: ${f.maliciousAction})`,
              `${f.everyoneMention ? e.on : e.off} @everyone Mentions (Action: ${f.everyoneAction})`,
              `${f.webhookSpam     ? e.on : e.off} Webhook Spam`,
              `${f.deleteOnTrigger ? e.on : e.off} Delete Message on Trigger`,
            ].join("\n"), inline: false },
        )
        .setFooter({ text: "!heat <slot> ?on/?off | !heat <value> ?set <slot>" })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── Master toggle ─────────────────────────────────────
    if (slot === "1") {
      if (flag !== "?on" && flag !== "?off") return message.reply(`${e.error} Use \`!heat 1 ?on\` or \`!heat 1 ?off\``);
      const val = flag === "?on";
      await AutoModConfig(guildDb.connection).findOneAndUpdate({ guildId: guild.id }, { $set: { enabled: val } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(val ? 0x57F287 : 0xED4245)
        .setDescription(`${val ? e.on : e.off} AutoMod / Heat System turned **${val ? "ON" : "OFF"}**.`)] });
    }

    // ── Anti-spam toggle ──────────────────────────────────
    if (slot === "2") {
      if (flag !== "?on" && flag !== "?off") return message.reply(`${e.error} Use \`!heat 2 ?on\` or \`!heat 2 ?off\``);
      const val = flag === "?on";
      await AutoModConfig(guildDb.connection).findOneAndUpdate({ guildId: guild.id }, { $set: { "filters.antiSpam": val } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(val ? 0x57F287 : 0xED4245)
        .setDescription(`${val ? e.on : e.off} Anti-Spam filters turned **${val ? "ON" : "OFF"}**.`)] });
    }

    // ── Numeric settings ──────────────────────────────────
    if (flag === "?set") {
      const num = parseFloat(slot);
      if (isNaN(num) || num <= 0) return message.reply(`${e.error} Provide a valid positive number.`);

      const slotMap = {
        "3": { field: "heat.maxPercent",      label: "Max Heat",        format: `${num}%`, min: 10,  max: 500  },
        "4": { field: "heat.degradationRate", label: "Degradation Rate",format: `${num}%/s`, min: 0.1, max: 50 },
        "5": { field: "heat.strikeTimeout",   label: "Strike Timeout",  format: formatDuration(num), min: 60, max: 604800 },
        "6": { field: "heat.capTimeout",      label: "Cap Timeout",     format: formatDuration(num), min: 60, max: 2419200 },
        "7": { field: "heat.capCount",        label: "Cap Count",       format: `${num} strikes`, min: 1, max: 20 },
        "8": { field: "heat.multiplier",      label: "Multiplier",      format: `${num}x`, min: 1, max: 10 },
      };

      const setting = slotMap[value];
      if (!setting) return message.reply(`${e.error} Slot must be 3–8.`);
      if (num < setting.min || num > setting.max) return message.reply(`${e.error} Value must be between ${setting.min} and ${setting.max}.`);

      await AutoModConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [setting.field]: num } }
      );
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.success} **${setting.label}** set to \`${setting.format}\`.`)] });
    }

    return message.reply(`${e.error} Usage: \`!heat\` to view settings | \`!heat 1 ?on/?off\` | \`!heat <value> ?set <3-8>\``);
  },
};

function canManage(message) {
  return message.member?.permissions.has("ManageGuild") ||
    message.guild?.ownerId === message.author.id;
}

function formatDuration(secs) {
  if (secs >= 86400) return `${Math.floor(secs/86400)}d`;
  if (secs >= 3600)  return `${Math.floor(secs/3600)}h`;
  if (secs >= 60)    return `${Math.floor(secs/60)}m`;
  return `${secs}s`;
}
