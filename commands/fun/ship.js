const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { generateShipCard } = require("../../utils/shipUtils");
const e = require("../../emojis/funemoji");

module.exports = {
  name: "ship",
  description: "Test the love between two users with a modern card.",
  category: "fun",
  aliases: ["love", "match"],
  usage: "<user1> [user2]",
  cooldown: 5,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Test the love between two users.")
    .addUserOption(o => o.setName("user1").setDescription("First user").setRequired(true))
    .addUserOption(o => o.setName("user2").setDescription("Second user").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const user1 = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user1");
    const user2 = ctx.type === "prefix" ? (ctx.message.mentions.users.at(1) || ctx.message.author) : (ctx.interaction.options.getUser("user2") || ctx.interaction.user);

    if (!user1) return reply(ctx, { content: "Mention someone to ship!" });

    // Inform user (generation can take a second)
    if (ctx.interaction) await ctx.interaction.deferReply();
    else {
      // Small feedback for prefix
    }

    const love = Math.floor(Math.random() * 101);
    
    try {
      const card = await generateShipCard(user1, user2, love);

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.ship} Matchmaking Machine`)
        .setDescription(`Shipping **${user1.username}** and **${user2.username}**...`)
        .setImage("attachment://ship.png")
        .setFooter({ text: getShipStatus(love) })
        .setTimestamp();

      return reply(ctx, { embeds: [embed], files: [card] });
    } catch (err) {
      console.error(err);
      return reply(ctx, { content: "Failed to generate ship card. Please try again." });
    }
  },
};

function getShipStatus(love) {
  if (love === 100) return "💞 Soulmates Forever!";
  if (love >= 90)  return "❤️ A Match Made in Heaven!";
  if (love >= 75)  return "💖 Truly In Love!";
  if (love >= 50)  return "💕 There's a strong spark!";
  if (love >= 25)  return "💙 Just Friends (For Now).";
  return "🖤 Not a chance...";
}
