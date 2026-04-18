const { SlashCommandBuilder } = require("discord.js");
const AkiGame = require("../../utils/akiUtils");

module.exports = {
  name: "aki",
  description: "Play a game of Akinator.",
  category: "fun",
  aliases: ["akinator"],
  usage: "[region]",
  cooldown: 10,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("aki")
    .setDescription("Play a game of Akinator.")
    .addStringOption(o => 
      o.setName("region")
       .setDescription("The language/region to play in.")
       .addChoices(
         { name: "English", value: "en" },
         { name: "Arabic", value: "ar" },
         { name: "French", value: "fr" },
         { name: "Spanish", value: "es" },
         { name: "Japanese", value: "jp" },
         { name: "Russian", value: "ru" },
         { name: "Portuguese", value: "pt" }
       )
       .setRequired(false)
    )
    .toJSON(),

  async execute(client, ctx) {
    const region = ctx.type === "prefix" ? (ctx.args[0] || "en") : (ctx.interaction.options.getString("region") || "en");
    
    try {
      const game = new AkiGame(ctx, region);
      await game.start();
    } catch (err) {
      // Catch 403 or network errors gracefully
      let errorMessage = "The Akinator service is currently unavailable. Please try again later.";
      if (err.response?.status === 403) {
        errorMessage = "Akinator is blocking the connection (403). Try again in a few minutes.";
      }
      
      console.error("[Akinator Error]", err.message);

      if (ctx.type === "prefix") return ctx.message.reply(errorMessage);
      else return ctx.interaction.reply({ content: errorMessage, ephemeral: true });
    }
  },
};