const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/funemoji");

module.exports = {
  name: "8ball",
  description: "Ask the magic 8-ball a question.",
  category: "fun",
  aliases: ["eightball"],
  usage: "<question>",
  cooldown: 3,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball a question.")
    .addStringOption(o => o.setName("question").setDescription("The question to ask.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const question = ctx.type === "prefix" ? ctx.args.join(" ") : ctx.interaction.options.getString("question");

    if (!question) {
      return reply(ctx, { content: "Please provide a question." });
    }

    const responses = [
      "It is certain.",
      "It is decidedly so.",
      "Without a doubt.",
      "Yes definitely.",
      "You may rely on it.",
      "As I see it, yes.",
      "Most likely.",
      "Outlook good.",
      "Yes.",
      "Signs point to yes.",
      "Reply hazy, try again.",
      "Ask again later.",
      "Better not tell you now.",
      "Cannot predict now.",
      "Concentrate and ask again.",
      "Don't count on it.",
      "My reply is no.",
      "My sources say no.",
      "Outlook not so good.",
      "Very doubtful."
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.eightball} Magic 8-Ball`)
      .addFields(
        { name: "Question", value: question },
        { name: "Answer", value: response }
      );

    return reply(ctx, { embeds: [embed] });
  },
};