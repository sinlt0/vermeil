// ============================================================
//  commands/antinuke/anlogs.js
//  !anlogs           — view recent antinuke action logs
//  !anlogs @user     — filter logs by user
// ============================================================
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const e = require("../../emojis/antinukeemoji");

const PER_PAGE = 8;

const SEVERITY_COLOR = { critical: 0xED4245, high: 0xFF7043, medium: 0xFEE75C, low: 0x57F287 };
const SEVERITY_EMOJI = { critical: "🔴", high: "🟠", medium: "🟡", low: "🟢" };

module.exports = {
  name: "anlogs", description: "View antinuke action logs.", category: "antinuke",
  aliases: ["antinukelogs", "anlog"], usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;

    if (!await canManage(client, guild, message.author.id)) return;

    const guildDb   = await client.db.getGuildDb(guild.id);
    const { fromConnection: AntiNukeLog } = require("../../models/AntiNukeLog");
    const LogModel  = AntiNukeLog(guildDb.connection);

    const targetUser = message.mentions.users.first();
    const query      = { guildId: guild.id };
    if (targetUser) query.targetId = targetUser.id;

    const logs = await LogModel.find(query).sort({ createdAt: -1 }).limit(100).lean();

    if (!logs.length) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x99AAB5)
        .setDescription(`${e.info} No antinuke logs found${targetUser ? ` for **${targetUser.tag}**` : ""}.`)] });
    }

    const totalPages = Math.ceil(logs.length / PER_PAGE);
    let page = 0;

    const buildEmbed = (pg) => {
      const slice = logs.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);
      const lines = slice.map(log => {
        const sev    = SEVERITY_EMOJI[log.severity] ?? "⚪";
        const time   = `<t:${Math.floor(new Date(log.createdAt).getTime() / 1000)}:R>`;
        const target = log.targetTag ? ` → **${log.targetTag}**` : "";
        return `${sev} \`${log.action}\`${target}\n┗ ${log.reason ?? "No reason"} • ${time}`;
      });

      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e.log} Antinuke Logs${targetUser ? ` — ${targetUser.tag}` : ""}`)
        .setDescription(lines.join("\n\n"))
        .setFooter({ text: `Page ${pg + 1}/${totalPages} • ${logs.length} total logs` })
        .setTimestamp();
    };

    const getComponents = (pg) => {
      if (totalPages <= 1) return [];
      return [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`anlogs_page_${message.id}`)
            .setPlaceholder(`Page ${pg + 1}/${totalPages}`)
            .addOptions(Array.from({ length: totalPages }, (_, i) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`Page ${i + 1}`)
                .setDescription(`Logs ${i * PER_PAGE + 1}–${Math.min((i + 1) * PER_PAGE, logs.length)}`)
                .setValue(`${i}`).setDefault(i === pg)
            ))
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("anlogs_prev").setLabel("◀").setStyle(ButtonStyle.Secondary).setDisabled(pg === 0),
          new ButtonBuilder().setCustomId("anlogs_next").setLabel("▶").setStyle(ButtonStyle.Secondary).setDisabled(pg >= totalPages - 1),
        ),
      ];
    };

    const msg = await message.reply({ embeds: [buildEmbed(page)], components: getComponents(page) });
    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({
      filter: i => {
        if (i.user.id !== message.author.id) { i.reply({ content: "❌", ephemeral: true }); return false; }
        return [`anlogs_page_${message.id}`, "anlogs_prev", "anlogs_next"].includes(i.customId);
      },
      time: 60_000,
    });

    collector.on("collect", async i => {
      await i.deferUpdate();
      if (i.customId === `anlogs_page_${message.id}`) page = parseInt(i.values[0]);
      else if (i.customId === "anlogs_prev") page = Math.max(0, page - 1);
      else if (i.customId === "anlogs_next") page = Math.min(totalPages - 1, page + 1);
      await msg.edit({ embeds: [buildEmbed(page)], components: getComponents(page) });
    });

    collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
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
