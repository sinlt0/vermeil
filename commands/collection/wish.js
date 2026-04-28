// ============================================================
//  commands/collection/wish.js
//  $wish <name>    — add to wishlist
//  $wish $<series> — add a series wish
//  $wish -<name>   — remove from wishlist
//  $wl             — view wishlist
// ============================================================
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { fromConnection: Wishlist }   = require("../../models/collection/Wishlist");
const { fromConnection: UserStats }  = require("../../models/collection/UserStats");
const { getActivePerks }             = require("../../utils/collection/badgeUtils");

const DEFAULT_SLOTS = 10;

module.exports = {
  name: "wish", description: "Manage your wishlist.",
  category: "collection", aliases: ["w wish","wl"],
  usage: "[+<name>|$<series>|-<name>]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;
    const arg     = ctx.args.join(" ").trim();

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const WLModel = Wishlist(guildDb.connection);
    const stats   = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId }).lean();
    const perks   = getActivePerks(stats);
    const maxSlots = perks.wishlistSlots ?? DEFAULT_SLOTS;

    // ── VIEW wishlist ──────────────────────────────────────
    if (!arg || ctx.commandName === "wl") {
      const wishes = await WLModel.find({ guildId: guild.id, userId }).lean();
      if (!wishes.length) return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`⭐ ${message.author.username}'s Wishlist`)
        .setDescription("Empty! Use `$wish <name>` to add characters.")] });

      const lines = wishes.map((w, i) => `\`${i + 1}.\` ${w.isSeries ? "📚" : "💕"} **${w.name}**${w.isSeries ? " *(series)*" : ""}`);

      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle(`⭐ ${message.author.username}'s Wishlist`)
        .setDescription(lines.join("\n"))
        .setFooter({ text: `${wishes.length}/${maxSlots} slots used` })] });
    }

    // ── REMOVE ─────────────────────────────────────────────
    if (arg.startsWith("-")) {
      const name = arg.slice(1).trim();
      const deleted = await WLModel.findOneAndDelete({
        guildId: guild.id, userId,
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
      if (!deleted) return message.reply(`❌ **${name}** is not on your wishlist.`);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
        .setDescription(`✅ Removed **${name}** from your wishlist.`)] });
    }

    // ── ADD ────────────────────────────────────────────────
    const isSeries = arg.startsWith("$");
    const name     = isSeries ? arg.slice(1).trim() : arg;

    const count = await WLModel.countDocuments({ guildId: guild.id, userId });
    if (count >= maxSlots) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xED4245)
        .setDescription(`❌ Wishlist full! (${count}/${maxSlots} slots)\nUpgrade your 🥉 Bronze Badge for more slots.`)] });
    }

    const exists = await WLModel.findOne({ guildId: guild.id, userId, name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (exists) return message.reply(`⚠️ **${name}** is already on your wishlist.`);

    await WLModel.create({ guildId: guild.id, userId, name, isSeries });

    return message.reply({ embeds: [new EmbedBuilder().setColor(0x57F287)
      .setDescription(`⭐ Added **${name}** ${isSeries ? "*(series)*" : ""} to your wishlist! (${count + 1}/${maxSlots})`)] });
  },
};
