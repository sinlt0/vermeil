const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { getUserData } = require("../../utils/collection/collectionUtils");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "wishlist",
  description: "Manage your anime character wishlist.",
  category: "collection",
  aliases: ["wish", "wishes"],
  usage: "[add/remove/list] [characterId]",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const userData = await getUserData(guildDb, guild.id, author.id);
    const sub = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    // ── LIST ──
    if (sub === "list" || !sub) {
      if (!userData.wishlist.length) return reply(ctx, { content: "✨ Your wishlist is currently empty!" });
      const list = userData.wishlist.map(id => `• ID: \`${id}\``).join("\n");
      const embed = new EmbedBuilder().setColor(0xFFD700).setTitle(`${e.wish} Your Wishlist`).setDescription(list);
      return reply(ctx, { embeds: [embed] });
    }

    // ── ADD ──
    if (sub === "add") {
      const id = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("id");
      if (isNaN(id)) return reply(ctx, { content: "Please provide a valid character ID." });
      if (userData.wishlist.includes(id)) return reply(ctx, { content: "This character is already on your wishlist!" });

      userData.wishlist.push(id);
      await userData.save();
      return reply(ctx, { content: `✅ Character \`${id}\` added to your wishlist!` });
    }

    // ── REMOVE ──
    if (sub === "remove") {
      const id = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("id");
      if (isNaN(id)) return reply(ctx, { content: "Please provide a valid character ID." });

      userData.wishlist = userData.wishlist.filter(w => w !== id);
      await userData.save();
      return reply(ctx, { content: `✅ Character \`${id}\` removed from your wishlist.` });
    }
  },
};