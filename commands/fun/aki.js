const { SlashCommandBuilder } = require("discord.js");
const akinator = require("discord.js-akinator");

module.exports = {
  name: "aki",
  description: "Play a game of Akinator.",
  category: "fun",
  aliases: ["akinator"],
  usage: "[language]",
  cooldown: 10,
  slash: false, // Using prefix-only worker pattern for Fun category

  async execute(client, ctx) {
    // ── Parse Language & Mode ──
    const language = ctx.type === "prefix" ? (ctx.args[0] || "en") : (ctx.interaction.options.getString("language") || "en");
    const mode = ctx.type === "prefix" ? (ctx.args[1] || "character").toLowerCase() : (ctx.interaction.options.getString("mode") || "character");
    
    // ── Determine target for the library ──
    const target = ctx.type === "prefix" ? ctx.message : ctx.interaction;

    try {
      await akinator(target, {
        language: language,
        childMode: false,
        gameType: ["animal", "character", "object"].includes(mode) ? mode : "character",
        useButtons: true,
        embedColor: "#5865F2" 
      });
    } catch (err) {
      console.error("[Akinator Error]", err.message);
      const content = "The Akinator session failed to start. Please try again later.";
      if (ctx.type === "prefix") ctx.message.reply(content);
      else ctx.interaction.reply({ content, ephemeral: true });
    }
  },
};