// ============================================================
//  commands/collection/firstmarry.js
//  $fm <name> — set your favorite character (displays first)
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");
const { findInHarem }                    = require("../../utils/collection/haremUtils");

module.exports = {
  name: "fm", description: "Set your favorite character.",
  category: "collection", aliases: ["firstmarry","fav"],
  usage: "<character name>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;
    const query   = ctx.args.join(" ").trim();

    if (!query) return message.reply("❌ Usage: `$fm <character name>`");

    const guildDb    = await client.db.getGuildDb(guild.id);
    const UCollModel = UserCollection(guildDb.connection);
    const entry      = await findInHarem(guildDb.connection, guild.id, userId, query);

    if (!entry) return message.reply(`❌ **${query}** not found in your harem.`);

    // Remove previous favorite
    await UCollModel.updateMany({ guildId: guild.id, userId, isFavorite: true }, { $set: { isFavorite: false } });

    // Set new favorite + move to position 0
    await UCollModel.findByIdAndUpdate(entry._id, { $set: { isFavorite: true, position: -1 } });

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0xFFD700)
      .setDescription(`⭐ **${entry.name}** is now your favorite character!`)] });
  },
};
