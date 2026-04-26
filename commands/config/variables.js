// ============================================================
//  commands/config/variables.js
//  Shows all available variables for welcome/leave messages
// ============================================================
const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");

module.exports = {
  name:             "variables",
  description:      "View all available variables for welcome and leave messages.",
  category:         "config",
  aliases:          ["vars", "welcomevars"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("variables")
    .setDescription("View all available variables for welcome and leave messages.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix"
      ? ctx.message.author
      : ctx.interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setAuthor({
        name:    "Welcome & Leave Variables",
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        "Use these variables in your welcome/leave messages and embeds.\n" +
        "They will be automatically replaced with real values when the message is sent.\n\u200b"
      )
      .addFields(
        {
          name: "👤 User Variables",
          value: [
            "`{user}`         → Mentions the user e.g. <@712123...>",
            "`{username}`     → Raw username e.g. rex",
            "`{usertag}`      → Full tag e.g. rex#0000 (if still used)",
            "`{userid}`       → User's ID e.g. 123456789",
            "`{useravatar}`   → User's avatar URL (high quality)",
          ].join("\n"),
          inline: false,
        },
        {
          name: "🏠 Server Variables",
          value: [
            "`{server}`       → Server name",
            "`{servername}`   → Server name (alias)",
            "`{guildname}`    → Server name (alias)",
            "`{membercount}`  → Total member count",
            "`{guildicon}`    → Server icon URL",
            "`{guildbanner}`  → Server banner URL (high quality)",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📈 Level Variables",
          value: [
            "`{level}`        → User's current level",
            "`{xp}`           → Current XP in level",
            "`{rank}`         → Server rank position",
          ].join("\n"),
          inline: false,
        },
        {
          name: "📅 Date Variables",
          value: [
            "`{joindate}`     → Date the user joined the server",
            "`{currentdate}`  → Today's date",
          ].join("\n"),
          inline: false,
        },
        {
          name: "💡 Usage Tips",
          value: [
            "• Variables work in **messages**, **embed titles**, **descriptions**, **footers**, and **author names**.",
            "• Use `{useravatar}` as a thumbnail URL to show the user's avatar in the embed.",
            "• Variables are **case sensitive** — use exactly as shown (e.g., `{server}`, NOT `{SERVER}`).",
            "• These variables also work in custom background URLs if you host them with user-id patterns.",
          ].join("\n"),
          inline: false,
        }
      )
      .setFooter({
        text:    `Requested by ${author.tag} • Use /greetconfig to set up`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};
