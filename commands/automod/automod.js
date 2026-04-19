// ============================================================
//  commands/automod/automod.js
//  General automod overview + filter action toggles
//
//  !automod                          — overview
//  !automod filter invites ?on/?off  — toggle invite filter
//  !automod filter malicious ?on/?off— toggle malicious links
//  !automod filter everyone ?on/?off — toggle @everyone filter
//  !automod filter webhooks ?on/?off — toggle webhook spam
//  !automod filter delete ?on/?off   — toggle delete on trigger
//  !automod action invites <action>  — set invite filter action
//  !automod action malicious <action>— set malicious link action
//  !automod action everyone <action> — set @everyone action
//  !automod action global <action>   — set global punishment
//  !automod logchannel #channel      — set automod log channel
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ensureConfig } = require("../../utils/automod/automodUtils");
const e = require("../../emojis/automodemoji");

const VALID_ACTIONS = ["timeout","kick","ban","warn"];

module.exports = {
  name: "automod", description: "General automod settings and overview.", category: "automod",
  aliases: ["amod"], usage: "[filter|action|logchannel] [target] [value]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    if (!canManage(message)) return;

    const config  = await ensureConfig(client, guild.id);
    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: AutoModConfig } = require("../../models/AutoModConfig");

    const sub   = ctx.args[0]?.toLowerCase();
    const target= ctx.args[1]?.toLowerCase();
    const value = ctx.args[2]?.toLowerCase();

    // ── LOG CHANNEL ───────────────────────────────────────
    if (sub === "logchannel") {
      const ch = message.mentions.channels.first() ?? guild.channels.cache.get(target);
      if (!ch) return message.reply(`${e.error} Mention a channel or provide a channel ID.`);
      await AutoModConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id }, { $set: { logChannelId: ch.id } }
      );
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.success} AutoMod log channel set to ${ch}.`)] });
    }

    // ── FILTER toggles ────────────────────────────────────
    if (sub === "filter") {
      const filterMap = {
        invites:   "filters.inviteLinks",
        malicious: "filters.maliciousLinks",
        everyone:  "filters.everyoneMention",
        webhooks:  "filters.webhookSpam",
        delete:    "filters.deleteOnTrigger",
      };
      const field = filterMap[target];
      if (!field) return message.reply(`${e.error} Valid filters: invites, malicious, everyone, webhooks, delete.`);

      if (value !== "?on" && value !== "?off") return message.reply(`${e.error} Use \`?on\` or \`?off\`.`);
      const val = value === "?on";
      await AutoModConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id }, { $set: { [field]: val } }
      );
      return message.reply({ embeds: [new EmbedBuilder().setColor(val ? 0x57F287 : 0xED4245)
        .setDescription(`${val ? e.on : e.off} **${target}** filter turned **${val ? "ON" : "OFF"}**.`)] });
    }

    // ── ACTION settings ───────────────────────────────────
    if (sub === "action") {
      const actionMap = {
        invites:   "filters.inviteAction",
        malicious: "filters.maliciousAction",
        everyone:  "filters.everyoneAction",
        global:    "punishment.action",
      };
      const field = actionMap[target];
      if (!field) return message.reply(`${e.error} Valid targets: invites, malicious, everyone, global.`);
      if (!VALID_ACTIONS.includes(value)) return message.reply(`${e.error} Action must be: timeout, kick, ban, warn.`);

      await AutoModConfig(guildDb.connection).findOneAndUpdate(
        { guildId: guild.id }, { $set: { [field]: value } }
      );
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.success} **${target}** action set to \`${value}\`.`)] });
    }

    // ── OVERVIEW ──────────────────────────────────────────
    const f = config.filters;
    const embed = new EmbedBuilder()
      .setColor(config.enabled ? 0x57F287 : 0xED4245)
      .setTitle(`${e.settings} AutoMod Overview — ${guild.name}`)
      .addFields(
        { name: `${config.enabled ? e.on : e.off} Status`, value: config.enabled ? "**Enabled**" : "**Disabled**", inline: true },
        { name: `${e.logChannel} Log Channel`, value: config.logChannelId ? `<#${config.logChannelId}>` : "Not set", inline: true },
        { name: `${e.timeout} Global Action`, value: `\`${config.punishment.action}\``, inline: true },
        { name: `${e.invite} Invite Links`,
          value: `${f.inviteLinks ? e.on : e.off} Enabled\nAction: \`${f.inviteAction}\``, inline: true },
        { name: `${e.phishing} Malicious Links`,
          value: `${f.maliciousLinks ? e.on : e.off} Enabled\nAction: \`${f.maliciousAction}\``, inline: true },
        { name: `${e.everyone} @everyone`,
          value: `${f.everyoneMention ? e.on : e.off} Enabled\nAction: \`${f.everyoneAction}\``, inline: true },
        { name: `${e.webhook} Webhook Spam`,
          value: `${f.webhookSpam ? e.on : e.off} Enabled`, inline: true },
        { name: `${e.delete} Delete on Trigger`,
          value: `${f.deleteOnTrigger ? e.on : e.off}`, inline: true },
      )
      .addFields(
        { name: `${e.info} Quick Commands`,
          value: `\`!heat\` — heat system settings\n\`!blacklist word/link add/remove/list\` — blacklists\n\`!jg\` — join gate settings\n\`!jr\` — join raid settings\n\`!automod filter <filter> ?on/?off\`\n\`!automod action <target> <action>\``,
          inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};

function canManage(message) {
  return message.member?.permissions.has("ManageGuild") || message.guild?.ownerId === message.author.id;
}
