// ============================================================
//  commands/collection/like.js
//  $like <name>     — like a character
//  $likelist / $ll  — view liked characters
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: LikeList }  = require("../../models/collection/LikeList");
const { fromConnection: Character } = require("../../models/collection/Character");

module.exports = {
  name: "like", description: "Like a character.",
  category: "collection", aliases: ["l"],
  usage: "<character name>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;
    const query   = ctx.args.join(" ").trim();

    if (!query) return message.reply("❌ Usage: `$like <character name>`");

    const guildDb   = await client.db.getGuildDb(guild.id);
    const CharModel = Character(guildDb.connection);
    const LLModel   = LikeList(guildDb.connection);

    const char = await CharModel.findOne({
      name: { $regex: new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }
    }).lean();

    if (!char) return message.reply(`❌ **${query}** not found. Use \`$im <name>\` to check.`);

    const exists = await LLModel.findOne({ guildId: guild.id, userId, name: { $regex: new RegExp(`^${char.name}$`, "i") } });
    if (exists) {
      // Toggle off
      await LLModel.deleteOne({ _id: exists._id });
      await CharModel.findByIdAndUpdate(char._id, { $inc: { globalLikeCount: -1 } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x99AAB5)
        .setDescription(`💔 Removed **${char.name}** from your like list.`)] });
    }

    await LLModel.create({ guildId: guild.id, userId, characterId: char._id, name: char.name, series: char.series });
    await CharModel.findByIdAndUpdate(char._id, { $inc: { globalLikeCount: 1 } });

    return message.reply({ embeds: [new EmbedBuilder().setColor(0xFF69B4)
      .setDescription(`❤️ Liked **${char.name}** from *${char.series}*!`)] });
  },
};
