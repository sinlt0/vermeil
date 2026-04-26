const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchRandomCharacter } = require("../../utils/guessUtils");
const e = require("../../emojis/funemoji");

module.exports = {
  name: "guesswho",
  description: "Guess the anime character!",
  category: "fun",
  aliases: ["gw", "guess"],
  usage: "",
  cooldown: 15,
  slash: false, // Worker pattern

  async execute(client, ctx) {
    if (ctx.interaction) await ctx.interaction.deferReply();
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    try {
      const character = await fetchRandomCharacter();
      
      // Generate 3 wrong options + 1 correct
      const options = [character.name];
      while (options.length < 4) {
        const dummy = await fetchRandomCharacter().catch(() => null);
        if (dummy && !options.includes(dummy.name)) options.push(dummy.name);
      }
      options.sort(() => Math.random() - 0.5);

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`${e.fun} Who is this character?`)
        .setDescription(`**Anime:** ${character.anime}\n\nYou have 30 seconds to guess!`)
        .setImage(character.image)
        .setFooter({ text: "Difficulty: Top 200 Popular Characters" });

      const row = new ActionRowBuilder().addComponents(
        options.map((opt, i) => 
          new ButtonBuilder().setCustomId(`guess_${i}`).setLabel(opt).setStyle(ButtonStyle.Primary)
        )
      );

      const msg = await (ctx.type === "prefix" ? ctx.message.reply({ embeds: [embed], components: [row] }) : ctx.interaction.editReply({ embeds: [embed], components: [row] }));

      const filter = i => i.user.id === author.id;
      const collector = msg.createMessageComponentCollector({ filter, time: 30000, max: 1 });

      collector.on("collect", async i => {
        const selected = options[parseInt(i.customId.split("_")[1])];
        
        if (selected === character.name) {
          await i.update({ 
            content: `✨ **Correct!** It was **${character.name}** from **${character.anime}**!`, 
            embeds: [embed.setColor(0x4A3F5F)], 
            components: [] 
          });
        } else {
          await i.update({ 
            content: `❌ **Wrong!** It was actually **${character.name}**.`, 
            embeds: [embed.setColor(0x4A3F5F)], 
            components: [] 
          });
        }
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
          msg.edit({ content: `⏰ **Time's up!** It was **${character.name}**.`, components: [] }).catch(() => null);
        }
      });

    } catch (err) {
      console.error(err);
      const content = "Failed to start the guessing game. Try again later.";
      if (ctx.type === "prefix") ctx.message.reply(content);
      else ctx.interaction.editReply({ content });
    }
  },
};