const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "topserv",
  description: "View the top collected characters in this server.",
  category: "collection",
  aliases: ["ts", "top"],
  usage: "",
  cooldown: 10,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ClaimModel = CharacterClaim(guildDb.connection);

    // Aggregate to find most claimed characters globally or per server
    // For now, let's just list the most recent 10 claims as a "Latest" list
    const top = await ClaimModel.find({ guildId: ctx.guild.id }).sort({ claimedAt: -1 }).limit(10);

    if (!top.length) return reply(ctx, { content: "No characters have been claimed yet!" });

    const list = top.map((c, i) => `\`${i+1}.\` **${c.characterName}** — <@${c.userId}>`).join("\n");

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.star} Server Top Characters`)
      .setDescription(list)
      .setFooter({ text: "Showing latest 10 claims" });

    return reply(ctx, { embeds: [embed] });
  },
};