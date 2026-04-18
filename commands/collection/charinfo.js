const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { searchCharacter } = require("../../utils/collection/collectionUtils");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "charinfo",
  description: "View detailed info about an anime character.",
  category: "collection",
  aliases: ["im", "char"],
  usage: "<character name or ID>",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const query = ctx.type === "prefix" ? ctx.args.join(" ") : ctx.interaction.options.getString("query");
    if (!query) return reply(ctx, { content: "Provide a character name or ID." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const char = await searchCharacter(query);

    if (!char) return reply(ctx, { content: "Character not found." });

    // Check if claimed in this server
    const ClaimModel = CharacterClaim(guildDb.connection);
    const claim = await ClaimModel.findOne({ guildId: ctx.guild.id, characterId: char.id });

    const embed = new EmbedBuilder()
      .setColor(claim ? 0xED4245 : 0x5865F2)
      .setTitle(`${char.name}`)
      .setURL(char.url)
      .setDescription(`**Anime:** ${char.anime}\n**Gender:** ${char.gender}\n\n${char.desc.replace(/<[^>]*>?/gm, '').slice(0, 300)}...`)
      .setThumbnail(char.image)
      .addFields({ name: "Status", value: claim ? `💖 Claimed by <@${claim.userId}>` : "💍 Available to claim!" })
      .setFooter({ text: `ID: ${char.id}` });

    return reply(ctx, { embeds: [embed] });
  },
};