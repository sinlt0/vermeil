// ============================================================
//  commands/collection/divorce.js
//  $divorce <character name> — remove from harem, gain kakera
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { divorceCharacter, findInHarem }    = require("../../utils/collection/haremUtils");
const { calcKakeraValue }                  = require("../../utils/collection/kakera");
const { fromConnection: UserStats }        = require("../../models/collection/UserStats");
const { fromConnection: Character }        = require("../../models/collection/Character");

module.exports = {
  name: "divorce", description: "Remove a character from your harem.",
  category: "collection", aliases: ["di"],
  usage: "<character name>", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;
    const query   = ctx.args.join(" ").trim();

    if (!query) return message.reply("❌ Usage: `$divorce <character name>`");

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const entry = await findInHarem(guildDb.connection, guild.id, userId, query);
    if (!entry) return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0xED4245)
      .setDescription(`❌ **${query}** not found in your harem.`)] });

    // Calculate kakera refund
    const charDoc = await Character(guildDb.connection).findById(entry.characterId).lean();
    const kakera  = charDoc ? calcKakeraValue(charDoc, charDoc.globalClaimCount, charDoc.globalLikeCount, 0, entry.keys) : 50;

    // Confirmation
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("divorce_confirm").setLabel(`Divorce ${entry.name}`).setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("divorce_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
    );

    const confirmMsg = await message.reply({
      embeds: [new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle("💔 Confirm Divorce")
        .setDescription(
          `Are you sure you want to divorce **${entry.name}** from *${entry.series}*?\n\n` +
          `You will receive 💜 **${kakera}** kakera.\n` +
          `${entry.keys > 0 ? `⚠️ This character has 🔑 **${entry.keys}** key${entry.keys !== 1 ? "s" : ""} — these will be lost!` : ""}`
        )],
      components: [row],
    });

    const i = await confirmMsg.awaitMessageComponent({
      filter: i => i.user.id === userId,
      time:   20_000,
    }).catch(() => null);

    if (!i || i.customId === "divorce_cancel") {
      return confirmMsg.edit({ embeds: [new EmbedBuilder().setColor(0x99AAB5).setDescription("Divorce cancelled.")], components: [] });
    }

    await i.deferUpdate();

    const result = await divorceCharacter(guildDb.connection, guild.id, userId, query);
    if (!result.success) {
      return confirmMsg.edit({ embeds: [new EmbedBuilder().setColor(0xED4245).setDescription("❌ Could not find character.")], components: [] });
    }

    // Give kakera
    await UserStats(guildDb.connection).findOneAndUpdate(
      { guildId: guild.id, userId },
      { $inc: { kakera: kakera, totalKakeraSent: kakera } },
      { upsert: true }
    );

    return confirmMsg.edit({
      embeds: [new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`💔 Divorced **${entry.name}** from *${entry.series}*.\n💜 +**${kakera}** kakera received.`)],
      components: [],
    });
  },
};
