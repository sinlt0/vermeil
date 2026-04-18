const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");
const { getUserData } = require("../../utils/collection/collectionUtils");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "favorite",
  description: "Set your favorite character to show on your profile.",
  category: "collection",
  aliases: ["fm", "firstmarry"],
  usage: "<character name or ID>",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const query = ctx.type === "prefix" ? ctx.args.join(" ") : ctx.interaction.options.getString("character");
    if (!query) return reply(ctx, { content: "Provide a character name or ID." });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ClaimModel = CharacterClaim(guildDb.connection);
    
    // Check if they own it
    const search = isNaN(query) ? { guildId: ctx.guild.id, userId: ctx.author.id, characterName: new RegExp(query, "i") } : { guildId: ctx.guild.id, userId: ctx.author.id, characterId: parseInt(query) };
    const claim = await ClaimModel.findOne(search);

    if (!claim) return reply(ctx, { content: "❌ You don't own this character!" });

    const userData = await getUserData(guildDb, ctx.guild.id, ctx.author.id);
    userData.favoriteCharacterId = claim.characterId;
    await userData.save();

    return reply(ctx, { content: `✨ **${claim.characterName}** is now your favorite character!` });
  },
};