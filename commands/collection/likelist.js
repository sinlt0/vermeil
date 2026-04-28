// ============================================================
//  commands/collection/likelist.js
//  $likelist / $ll [@user] — view like list
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: LikeList } = require("../../models/collection/LikeList");
const { fromConnection: UserStats }= require("../../models/collection/UserStats");

module.exports = {
  name: "ll", description: "View your like list.",
  category: "collection", aliases: ["likelist"],
  usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const target  = message.mentions.users.first() ?? message.author;

    const guildDb  = await client.db.getGuildDb(guild.id);
    const LLModel  = LikeList(guildDb.connection);
    const stats    = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId: target.id }).lean();

    const likes    = await LLModel.find({ guildId: guild.id, userId: target.id }).lean();
    if (!likes.length) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`❤️ ${target.username}'s Like List`)
        .setDescription("Nothing liked yet! Use `$like <name>` to like characters.")] });
    }

    const lines = likes.map((l, i) => `\`${i + 1}.\` **${l.name}** — *${l.series ?? "Unknown"}*`);
    const title = stats?.likeListTitle ?? `❤️ ${target.username}'s Like List`;

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0xFF69B4)
      .setTitle(title)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `${likes.length} liked` })] });
  },
};
