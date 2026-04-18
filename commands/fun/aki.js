const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const AkiStealth = require("../../utils/akiStealth");
const e = require("../../emojis/funemoji");

module.exports = {
  name: "aki",
  description: "Play a game of Akinator with stealth bypass.",
  category: "fun",
  aliases: ["akinator"],
  usage: "[language]",
  cooldown: 15,
  slash: false,

  async execute(client, ctx) {
    const language = ctx.type === "prefix" ? (ctx.args[0] || "en") : (ctx.interaction.options.getString("language") || "en");
    const mode = ctx.type === "prefix" ? (ctx.args[1] || "character").toLowerCase() : (ctx.interaction.options.getString("mode") || "character");
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const game = new AkiStealth(language, mode);
    let msg;

    try {
      if (ctx.interaction) await ctx.interaction.deferReply();
      const initial = await game.start();
      
      msg = await renderGame(ctx, game, initial.question);
      startCollector(msg, game, author, ctx);

    } catch (err) {
      console.error("[Aki Stealth Error]", err.message);
      const content = "Akinator is currently blocking the connection. Please try again in a few minutes.";
      if (ctx.type === "prefix") ctx.message.reply(content);
      else ctx.interaction.editReply({ content });
    }
  },
};

async function renderGame(ctx, game, question) {
  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${e.aki} Akinator`)
    .setDescription(`**Step ${game.step + 1}**\n\n${question}`)
    .setFooter({ text: `Progress: ${Math.round(game.progression)}%` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("0").setLabel("Yes").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("1").setLabel("No").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("2").setLabel("Probably").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("3").setLabel("Probably Not").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("4").setLabel("Idk").setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("stop").setLabel("Stop Game").setStyle(ButtonStyle.Danger)
  );

  const payload = { embeds: [embed], components: [row, row2] };
  return ctx.type === "prefix" ? ctx.message.reply(payload) : ctx.interaction.editReply(payload);
}

function startCollector(msg, game, author, ctx) {
  const filter = i => i.user.id === author.id;
  const collector = msg.createMessageComponentCollector({ filter, time: 300000 });

  collector.on("collect", async i => {
    await i.deferUpdate();
    if (i.customId === "stop") return collector.stop("stopped");

    try {
      const next = await game.sendAnswer(i.customId);
      
      // Check if game is won (progression > 95 or step limit)
      if (game.progression >= 97 || game.step >= 70) {
         // Note: Full guessing logic requires an additional API call to /list
         // For now, we tell the user the bot is ready to guess
         return i.editReply({ content: `${e.aki} **I think I know who it is!** (Feature coming in next update)`, components: [] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${e.aki} Akinator`)
        .setDescription(`**Step ${game.step + 1}**\n\n${game.question}`)
        .setFooter({ text: `Progress: ${Math.round(game.progression)}%` });

      await i.editReply({ embeds: [embed] });
    } catch (err) {
      collector.stop("error");
    }
  });

  collector.on("end", (_, reason) => {
    if (reason === "stopped") msg.edit({ content: "Game stopped.", embeds: [], components: [] });
    else if (reason === "error") msg.edit({ content: "Connection lost.", embeds: [], components: [] });
    else msg.edit({ components: [] }).catch(() => null);
  });
}
