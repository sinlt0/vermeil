// ============================================================
//  commands/collection/infomarry.js
//  $im <character name> — look up character info
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: Character }      = require("../../models/collection/Character");
const { fromConnection: UserCollection } = require("../../models/collection/UserCollection");
const { getCharacterImage }              = require("../../utils/collection/imageCache");
const { calcKakeraValue }                = require("../../utils/collection/kakera");

module.exports = {
  name: "im", description: "Look up info on a character.",
  category: "collection", aliases: ["infomarry", "info"],
  usage: "<character name>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const query   = ctx.args.join(" ").trim();

    if (!query) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x4A3F5F)
          .setDescription("❌ Usage: `$im <character name>`")],
      });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const CharModel = Character(guildDb.connection);
    const regex     = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const char = await CharModel.findOne({
      $or: [{ name: regex }, { aliases: regex }],
    }).lean();

    if (!char) {
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x4A3F5F)
          .setDescription(
            `❌ **${query}** not found in the character database.\n` +
            `Try \`$cl ${query}\` to search by series name.`
          )],
      });
    }

    // Find owner in this guild
    const UCollModel = UserCollection(guildDb.connection);
    const entry      = await UCollModel.findOne({ guildId: guild.id, characterId: char._id }).lean();
    const owner      = entry ? await guild.members.fetch(entry.userId).catch(() => null) : null;

    // Calc claim + like rank
    const claimRank = (await CharModel.countDocuments({ globalClaimCount: { $gt: char.globalClaimCount } })) + 1;
    const likeRank  = (await CharModel.countDocuments({ globalLikeCount:  { $gt: char.globalLikeCount  } })) + 1;
    const kakera    = calcKakeraValue(char, claimRank, likeRank, 0, entry?.keys ?? 0);
    const imageUrl  = await getCharacterImage(char);

    const typeEmoji = char.type === "waifu" ? "💕" : "💙";

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${typeEmoji} ${char.name}`)
      .setImage(imageUrl)
      .addFields(
        { name: "Series",     value: char.series,                                             inline: true },
        { name: "Type",       value: `${typeEmoji} ${char.type}`,                            inline: true },
        { name: "Source",     value: char.source,                                             inline: true },
        { name: "Claim Rank", value: `#${claimRank.toLocaleString()}`,                       inline: true },
        { name: "Like Rank",  value: `#${likeRank.toLocaleString()}`,                        inline: true },
        { name: "Kakera",     value: `💜 ${kakera}`,                                         inline: true },
        { name: "Claimed by", value: owner ? `${owner.user.tag}` : "No one in this server",  inline: false },
        ...(entry?.keys > 0 ? [{ name: "Keys", value: `🔑 ${entry.keys}`, inline: true }] : []),
      )
      .setFooter({ text: `Global claims: ${char.globalClaimCount} • Global likes: ${char.globalLikeCount}` });

    return message.reply({ embeds: [embed] });
  },
};
