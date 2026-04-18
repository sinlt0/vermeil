// ============================================================
//  commands/antinuke/quarantine.js
//  !quarantine @user [reason]    — quarantine a member
//  !quarantine remove @user      — unquarantine
//  !quarantine list              — list all quarantined members
// ============================================================
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { isImmune, quarantineMember, unquarantineMember } = require("../../utils/antiNukeUtils");
const e = require("../../emojis/antinukeemoji");

const PER_PAGE = 5;

module.exports = {
  name: "quarantine", description: "Manage quarantine.", category: "antinuke",
  aliases: ["q", "quar"], usage: "<@user|remove|list> [reason]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb = await client.db.getGuildDb(guild.id);
    const { fromConnection: QuarantineEntry } = require("../../models/QuarantineEntry");
    const QModel = QuarantineEntry(guildDb.connection);

    const sub = ctx.args[0]?.toLowerCase();

    // ── LIST ──────────────────────────────────────────────
    if (sub === "list") {
      const entries = await QModel.find({ guildId: guild.id }).lean();
      if (!entries.length) return message.reply(`${e.info} No members are currently quarantined.`);

      const totalPages = Math.ceil(entries.length / PER_PAGE);
      let page = 0;

      const buildEmbed = (pg) => {
        const slice = entries.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);
        const lines = slice.map((entry, i) =>
          `\`${pg * PER_PAGE + i + 1}.\` **${entry.userTag ?? entry.userId}**\n` +
          `┣ Reason: ${entry.reason}\n` +
          `┗ <t:${Math.floor(new Date(entry.quarantinedAt).getTime() / 1000)}:R>`
        );
        return new EmbedBuilder()
          .setColor(0xED4245)
          .setTitle(`${e.quarantine} Quarantine List — ${guild.name}`)
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: `Page ${pg + 1}/${totalPages} • ${entries.length} quarantined` });
      };

      const getComponents = (pg) => {
        if (totalPages <= 1) return [];
        const dropdown = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`q_page_${message.id}`)
            .setPlaceholder(`Page ${pg + 1}/${totalPages}`)
            .addOptions(Array.from({ length: totalPages }, (_, i) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`Page ${i + 1}`)
                .setDescription(`Members ${i * PER_PAGE + 1}–${Math.min((i + 1) * PER_PAGE, entries.length)}`)
                .setValue(`${i}`).setDefault(i === pg)
            ))
        );
        const buttons = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("q_prev").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
          new ButtonBuilder().setCustomId("q_next").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(pg >= totalPages - 1),
        );
        return [dropdown, buttons];
      };

      const msg = await message.reply({ embeds: [buildEmbed(page)], components: getComponents(page) });
      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({
        filter: i => { if (i.user.id !== message.author.id) { i.reply({ content: "❌", ephemeral: true }); return false; } return true; },
        time: 60_000,
      });
      collector.on("collect", async i => {
        await i.deferUpdate();
        if (i.customId === `q_page_${message.id}`) page = parseInt(i.values[0]);
        else if (i.customId === "q_prev") page = Math.max(0, page - 1);
        else if (i.customId === "q_next") page = Math.min(totalPages - 1, page + 1);
        await msg.edit({ embeds: [buildEmbed(page)], components: getComponents(page) });
      });
      collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
      return;
    }

    // ── REMOVE ────────────────────────────────────────────
    if (sub === "remove") {
      const targetUser = message.mentions.users.first() ?? { id: ctx.args[1] };
      if (!targetUser?.id) return message.reply(`${e.error} Provide a user mention or ID.`);

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) return message.reply(`${e.error} That member is not in this server.`);

      const result = await unquarantineMember(client, guild, member, message.author.id);
      if (!result.success) return message.reply(`${e.error} ${result.reason}`);

      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`${e.unquarantine} **${member.user.tag}** has been removed from quarantine.`)] });
    }

    // ── ADD (quarantine) ──────────────────────────────────
    const targetUser = message.mentions.users.first() ?? (ctx.args[0] ? { id: ctx.args[0] } : null);
    if (!targetUser?.id) return message.reply(`${e.error} Usage: \`!quarantine @user [reason]\``);

    const member = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) return message.reply(`${e.error} That member is not in this server.`);

    // Check if target is immune
    const immunity = await isImmune(client, guild, targetUser.id);
    if (immunity.immune) return message.reply(`${e.error} That user is immune (**${immunity.level}**) and cannot be quarantined.`);

    const reason = ctx.args.slice(1).join(" ") || "Manually quarantined";
    const result = await quarantineMember(client, guild, member, reason, null, false);

    if (!result.success) return message.reply(`${e.error} ${result.reason}`);

    return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
      .setDescription(`${e.quarantine} **${member.user.tag}** has been quarantined.\n**Reason:** ${reason}`)] });
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
