const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");
const axios = require("axios");

module.exports = {
  name: "truthordare",
  description: "Play a game of Truth or Dare!",
  category: "fun",
  aliases: ["tod", "truth", "dare"],
  usage: "[rating: pg|pg13|r]",
  cooldown: 3,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("truthordare")
    .setDescription("Play a game of Truth or Dare!")
    .addStringOption(o => 
      o.setName("rating")
       .setDescription("The rating of the questions.")
       .addChoices(
         { name: "PG (General)", value: "pg" },
         { name: "PG13 (Teen)", value: "pg13" },
         { name: "R (Mature)", value: "r" }
       )
       .setRequired(false)
    )
    .toJSON(),

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

    const msg = ctx.type === "prefix" ? response : response.resource.message;

    const filter = i => i.user.id === author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

    collector.on("collect", async i => {
      await i.deferUpdate();
      const [type, r] = i.customId.split("_");
      const targetType = type === "random" ? (Math.random() > 0.5 ? "truth" : "dare") : type;

      try {
        const res = await axios.get(`https://api.truthordarebot.xyz/v1/${targetType}?rating=${r}`);
        const data = res.data;

        const resultEmbed = new EmbedBuilder()
          .setColor(targetType === "truth" ? 0x5865F2 : 0xED4245)
          .setTitle(`${targetType === "truth" ? e.truth : e.dare} ${targetType.toUpperCase()}`)
          .setDescription(data.question)
          .setFooter({ text: `Rating: ${r.toUpperCase()} | ID: ${data.id} | Click again for more!` });

        await i.editReply({ embeds: [resultEmbed], components: [row] });
      } catch (err) {
        await i.editReply({ content: "Failed to fetch question. Please try again.", embeds: [], components: [row] });
      }
    });

    collector.on("end", (_, reason) => {
      if (reason === "time") {
        msg.edit({ components: [] }).catch(() => null);
      }
    });
  },
};