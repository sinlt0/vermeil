const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/devguildemoji");

const PER_PAGE = 10;

module.exports = {
  name:             "guildlist",
  description:      "List guilds the bot is in. (Owner/Dev only)",
  category:         "owner",
  aliases:          ["guilds", "serverlist", "servers"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          true,
  requiresDatabase: false,
  slash:            false,

  slashData: new SlashCommandBuilder()
    .setName("guildlist")
    .setDescription("List guilds the bot is in. Owner/Dev only.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const guilds = [...client.guilds.cache.values()]
      .sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
    const totalPages = Math.max(1, Math.ceil(guilds.length / PER_PAGE));
    let page = 0;

    const sent = await reply(ctx, {
      embeds: [buildEmbed(client, guilds, page, totalPages, author)],
      components: buildComponents(page, totalPages),
    });

    if (totalPages <= 1) return;

    const msg = ctx.type === "prefix" ? sent : await ctx.interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({
      filter: i => {
        if (i.user.id !== author.id) {
          i.reply({ content: "This guild list is not for you.", ephemeral: true });
          return false;
        }
        return ["guildlist_prev", "guildlist_next", "guildlist_home"].includes(i.customId);
      },
      time: 120_000,
    });

    collector.on("collect", async i => {
      await i.deferUpdate();
      if (i.customId === "guildlist_prev") page = Math.max(0, page - 1);
      if (i.customId === "guildlist_next") page = Math.min(totalPages - 1, page + 1);
      if (i.customId === "guildlist_home") page = 0;
      await msg.edit({ embeds: [buildEmbed(client, guilds, page, totalPages, author)], components: buildComponents(page, totalPages) });
    });

    collector.on("end", () => msg.edit({ components: [] }).catch(() => {}));
  },
};

function buildEmbed(client, guilds, page, totalPages, author) {
  const slice = guilds.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const totalMembers = guilds.reduce((sum, guild) => sum + (guild.memberCount ?? 0), 0);
  const lines = slice.map((guild, index) => {
    const n = page * PER_PAGE + index + 1;
    return `\`${n}.\` **${guild.name}**\n${e.id} \`${guild.id}\` • ${e.members} \`${(guild.memberCount ?? 0).toLocaleString()}\` • ${e.owner} \`${guild.ownerId ?? "unknown"}\``;
  });

  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${e.list} Guild List`)
    .setDescription(lines.join("\n\n") || "No guilds found.")
    .addFields(
      { name: `${e.guild} Guilds`, value: `\`${guilds.length.toLocaleString()}\``, inline: true },
      { name: `${e.members} Members`, value: `\`${totalMembers.toLocaleString()}\``, inline: true },
      { name: `${e.page} Page`, value: `\`${page + 1}/${totalPages}\``, inline: true },
    )
    .setFooter({ text: `Requested by ${author.tag} • ${client.user.username}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}

function buildComponents(page, totalPages) {
  if (totalPages <= 1) return [];
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("guildlist_prev").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId("guildlist_home").setLabel("Home").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
      new ButtonBuilder().setCustomId("guildlist_next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    ),
  ];
}