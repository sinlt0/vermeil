// ============================================================
//  commands/collection/sortmarry.js
//  $sm <sort>    — sort your harem display
//  $fm <name>    — set your favorite character
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");
const { SORT_MODES, findInHarem }        = require("../../utils/collection/haremUtils");

module.exports = {
  name: "sm", description: "Sort your harem.",
  category: "collection", aliases: ["sortmarry"],
  usage: "<al|az|ka|ea|me|ke>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message  = ctx.message;
    const guild    = message.guild;
    const userId   = message.author.id;
    const sortMode = ctx.args[0]?.toLowerCase();

    if (!sortMode || !SORT_MODES[sortMode]) {
      const modes = Object.entries(SORT_MODES).map(([k, v]) => `\`${k}\` — ${v.label}`).join("\n");
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle("Sort Modes")
        .setDescription(modes)] });
    }

    // Re-position all characters in the sorted order
    const guildDb    = await client.db.getGuildDb(guild.id);
    const UCollModel = UserCollection(guildDb.connection);
    const sorted     = await UCollModel.find({ guildId: guild.id, userId }).sort(SORT_MODES[sortMode].sort).lean();

    const bulkOps = sorted.map((char, i) => ({
      updateOne: { filter: { _id: char._id }, update: { $set: { position: i } } },
    }));

    if (bulkOps.length) await UCollModel.bulkWrite(bulkOps);

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
      .setDescription(`✅ Harem sorted by **${SORT_MODES[sortMode].label}**. View with \`$mm\`.`)] });
  },
};
