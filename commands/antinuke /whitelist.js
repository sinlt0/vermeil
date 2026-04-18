// ============================================================
//  commands/antinuke/whitelist.js
//  !whitelist @target              — interactive type selector
//  !whitelist list                 — list all entries
//  !whitelist remove @target       — remove from whitelist
//  !whitelist info @target         — check whitelist status
// ============================================================
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");
const { ensureConfig } = require("../../utils/antiNukeUtils");
const e = require("../../emojis/antinukeemoji");

const WHITELIST_TYPES = [
  { value: "spam",       label: "Spamming",           description: "Exempt from all spam filters"             },
  { value: "mentions",   label: "Mention Spamming",   description: "Exempt from mention/ping spam"            },
  { value: "invites",    label: "Invite Links",        description: "Can post discord invite links"            },
  { value: "everyone",   label: "@everyone Mentions",  description: "Can ping @everyone and public roles"     },
  { value: "quarantine", label: "Quarantine Touch",    description: "Can touch quarantined members (DANGEROUS)"},
  { value: "antinuke",   label: "Antinuke",            description: "Exempt from antinuke limits"             },
  { value: "automod",    label: "Automod",             description: "Exempt from entire automod"              },
  { value: "total",      label: "TOTAL Whitelist",     description: "Exempt from EVERYTHING (use with care)"  },
];

module.exports = {
  name: "whitelist", description: "Manage antinuke whitelist.", category: "antinuke",
  aliases: ["wl"], usage: "<@target|list|remove|info> [target]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: AntiNukeWhitelist } = require("../../models/AntiNukeWhitelist");
    const WLModel = AntiNukeWhitelist(guildDb.connection);

    const sub = ctx.args[0]?.toLowerCase();

    // ── LIST ──────────────────────────────────────────────
    if (sub === "list") {
      const entries = await WLModel.find({ guildId: guild.id }).lean();
      if (!entries.length) return message.reply(`${e.error} No whitelist entries found.`);

      const lines = entries.map(entry => {
        const types = entry.types.join(", ");
        return `• **${entry.targetName ?? entry.targetId}** (\`${entry.targetType}\`) — ${types}`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e.whitelist} Whitelist — ${guild.name}`)
        .setDescription(lines.join("\n") || "Empty.")
        .setFooter({ text: `${entries.length} entries` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // ── REMOVE ────────────────────────────────────────────
    if (sub === "remove") {
      const targetArg = message.mentions.users.first()
        ?? message.mentions.roles.first()
        ?? message.mentions.channels.first()
        ?? { id: ctx.args[1] };

      if (!targetArg?.id) return message.reply(`${e.error} Provide a target to remove.`);

      const deleted = await WLModel.findOneAndDelete({ guildId: guild.id, targetId: targetArg.id });
      if (!deleted) return message.reply(`${e.error} That target is not whitelisted.`);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.success} Removed \`${targetArg.id}\` from the whitelist.`)] });
    }

    // ── INFO ──────────────────────────────────────────────
    if (sub === "info") {
      const targetArg = message.mentions.users.first()
        ?? message.mentions.roles.first()
        ?? { id: ctx.args[1] };

      if (!targetArg?.id) return message.reply(`${e.error} Provide a target.`);

      const entry = await WLModel.findOne({ guildId: guild.id, targetId: targetArg.id }).lean();

      if (!entry) return message.reply({ embeds: [new EmbedBuilder().setColor(0x99AAB5)
        .setDescription(`\`${targetArg.id}\` is **not whitelisted**.`)] });

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setTitle(`${e.whitelisted} Whitelist Info`)
        .addFields(
          { name: "Target",   value: `\`${entry.targetId}\``,         inline: true },
          { name: "Type",     value: entry.targetType,                 inline: true },
          { name: "Exempt From", value: entry.types.join(", ") || "None", inline: false },
        )] });
    }

    // ── ADD (interactive type selector) ───────────────────
    const targetUser    = message.mentions.users.first();
    const targetRole    = message.mentions.roles.first();
    const targetChannel = message.mentions.channels.first();
    const targetId      = ctx.args[0]; // raw ID fallback

    let target, targetType, targetName;

    if (targetUser)    { target = targetUser;    targetType = "user";    targetName = targetUser.tag; }
    else if (targetRole)    { target = targetRole;    targetType = "role";    targetName = targetRole.name; }
    else if (targetChannel) { target = targetChannel; targetType = "channel"; targetName = targetChannel.name; }
    else if (targetId && /^\d{15,20}$/.test(targetId)) {
      target = { id: targetId }; targetType = "user"; targetName = targetId;
    } else {
      return message.reply(`${e.error} Mention a user, role, or channel. Or use \`!whitelist list\` to see entries.`);
    }

    // Check if already whitelisted
    const existing = await WLModel.findOne({ guildId: guild.id, targetId: target.id }).lean();

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`wl_type_${message.id}`)
      .setPlaceholder("Select whitelist type(s)...")
      .setMinValues(1)
      .setMaxValues(WHITELIST_TYPES.length)
      .addOptions(WHITELIST_TYPES.map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(t.label)
          .setDescription(t.description)
          .setValue(t.value)
          .setDefault(existing?.types.includes(t.value) ?? false)
      ));

    const row = new ActionRowBuilder().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.whitelist} Whitelist — Select Types`)
      .setDescription(
        `Select which systems **${targetName}** (\`${target.id}\`) should be exempt from.\n\n` +
        `You can select multiple types at once.`
      );

    const msg = await message.reply({ embeds: [embed], components: [row] });

    const filter = i => i.user.id === message.author.id && i.customId === `wl_type_${message.id}`;
    const interaction = await msg.awaitMessageComponent({ filter, time: 60_000 }).catch(() => null);

    if (!interaction) return msg.edit({ components: [] }).catch(() => {});

    await interaction.deferUpdate();
    const selectedTypes = interaction.values;

    await WLModel.findOneAndUpdate(
      { guildId: guild.id, targetId: target.id },
      { $set: { guildId: guild.id, targetId: target.id, targetType, targetName, types: selectedTypes, addedBy: message.author.id } },
      { upsert: true }
    );

    const typeLabels = selectedTypes.map(v => WHITELIST_TYPES.find(t => t.value === v)?.label).join(", ");

    await msg.edit({
      embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.success} **${targetName}** whitelisted for: **${typeLabels}**`)],
      components: [],
    });
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
