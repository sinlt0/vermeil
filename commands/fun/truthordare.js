const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");
const https = require("https");

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

module.exports = {
  name: "truthordare",
  description: "Play a game of Truth or Dare!",
  category: "fun",
  aliases: ["tod", "truth", "dare"],
  usage: "[rating: pg|pg13|r]",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    const rating = ctx.type === "prefix" ? (ctx.args[0] || "pg").toLowerCase() : (ctx.interaction.options.getString("rating") || "pg");
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.tod} Truth or Dare`)
      .setDescription("Choose your destiny! Will you tell the truth or take a dare?")
      .setFooter({ text: `Rating: ${rating.toUpperCase()} | Requested by ${author.tag}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`truth_${rating}`).setLabel("Truth").setStyle(ButtonStyle.Primary).setEmoji(e.truth),
      new ButtonBuilder().setCustomId(`dare_${rating}`).setLabel("Dare").setStyle(ButtonStyle.Danger).setEmoji(e.dare),
      new ButtonBuilder().setCustomId(`random_${rating}`).setLabel("Random").setStyle(ButtonStyle.Secondary)
    );

    const response = await (ctx.type === "prefix" 
      ? ctx.message.reply({ embeds: [embed], components: [row] }) 
      : ctx.interaction.reply({ embeds: [embed], components: [row], withResponse: true }));

    const msg = ctx.type === "prefix" ? response : (response.resource ? response.resource.message : await ctx.interaction.fetchReply());

    const filter = i => i.user.id === author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 120000 }); // Increased to 2 mins

    collector.on("collect", async i => {
      // 1. Defer immediately to tell Discord we're working on it
      await i.deferUpdate().catch(() => null);

      const [type, r] = i.customId.split("_");
      const targetType = type === "random" ? (Math.random() > 0.5 ? "truth" : "dare") : type;

      try {
        // 2. Fetch the question with a longer timeout
        const res = await axios.get(`https://api.truthordarebot.xyz/v1/${targetType}?rating=${r}`, {
          httpsAgent: httpsAgent,
          timeout: 10000 
        });
        const data = res.data;

        const resultEmbed = new EmbedBuilder()
          .setColor(targetType === "truth" ? 0x5865F2 : 0xED4245)
          .setTitle(`${targetType === "truth" ? e.truth : e.dare} ${targetType.toUpperCase()}`)
          .setDescription(data.question)
          .setFooter({ text: `Rating: ${r.toUpperCase()} | ID: ${data.id} | Play again!` });

        // 3. Update the original message with the result and keep buttons
        await i.editReply({ embeds: [resultEmbed], components: [row] });
      } catch (err) {
        console.error(`[TOD Error] ${err.message}`);
        await i.followUp({ content: "Failed to fetch a new question. The API might be slow, try again.", ephemeral: true }).catch(() => null);
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        msg.edit({ components: [] }).catch(() => null);
      }
    });
  },
};