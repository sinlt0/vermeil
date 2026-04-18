const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "inventory",
  description: "View your collected anime characters.",
  category: "collection",
  aliases: ["inv", "coll", "collection"],
  usage: "[@user]",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const target = ctx.type === "prefix" ? (ctx.message.mentions.users.first() || ctx.message.author) : (ctx.interaction.options.getUser("user") || ctx.interaction.user);
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const ClaimModel = CharacterClaim(guildDb.connection);
    const claims = await ClaimModel.find({ guildId: guild.id, userId: target.id }).sort({ claimedAt: -1 });

    if (!claims.length) {
      return reply(ctx, { content: target.id === ctx.author.id ? "❌ You haven't collected any characters yet! Use `!roll` to start." : `❌ **${target.username}** hasn't collected any characters yet.` });
    }

    // ── Pagination Setup ──
    const perPage = 10;
    const pages = Math.ceil(claims.length / perPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * perPage;
      const end = start + perPage;
      const currentClaims = claims.slice(start, end);

      const list = currentClaims.map((c, i) => `\`${start + i + 1}.\` **${c.characterName}** <t:${Math.floor(c.claimedAt.getTime()/1000)}:R>`).join("\n");

      return new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e.inventory} ${target.username}'s Collection`)
        .setDescription(list)
        .setFooter({ text: `Page ${page + 1} of ${pages} | Total: ${claims.length} characters` });
    };

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev").setLabel("Previous").setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("next").setLabel("Next").setStyle(ButtonStyle.Secondary).setDisabled(pages === 1)
    );

    const response = await (ctx.type === "prefix" 
      ? ctx.message.reply({ embeds: [generateEmbed(0)], components: [row] }) 
      : ctx.interaction.reply({ embeds: [generateEmbed(0)], components: [row], withResponse: true }));

    const message = ctx.type === "prefix" ? response : response.resource.message;
    if (pages === 1) return;

    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on("collect", async i => {
      if (i.user.id !== (ctx.type === "prefix" ? ctx.message.author.id : ctx.interaction.user.id)) {
        return i.reply({ content: "This is not your menu!", ephemeral: true });
      }

      if (i.customId === "prev") currentPage--;
      if (i.customId === "next") currentPage++;

      row.components[0].setDisabled(currentPage === 0);
      row.components[1].setDisabled(currentPage === pages - 1);

      await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
    });

    collector.on("end", () => {
      message.edit({ components: [] }).catch(() => null);
    });
  },
};