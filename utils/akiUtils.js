const { Aki } = require("aki-api");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const e = require("../emojis/funemoji");

/**
 * Aki Game Instance Handler
 */
class AkiGame {
  constructor(ctx, region = "en") {
    this.ctx = ctx;
    this.region = region;
    this.aki = new Aki({ region });
    this.message = null;
    this.collector = null;
  }

  async start() {
    await this.aki.start();
    return this.render();
  }

  async step(answer) {
    await this.aki.step(answer);
    if (this.aki.progress >= 70 || this.aki.currentStep >= 78) {
      await this.aki.win();
      return this.win();
    }
    return this.render();
  }

  async back() {
    await this.aki.back();
    return this.render();
  }

  getButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("0").setLabel("Yes").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("1").setLabel("No").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("2").setLabel("Probably").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("3").setLabel("Probably Not").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("4").setLabel("Idk").setStyle(ButtonStyle.Secondary)
    );
  }

  getUtilityButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("back").setLabel("Undo").setStyle(ButtonStyle.Primary).setDisabled(this.aki.currentStep === 0),
      new ButtonBuilder().setCustomId("stop").setLabel("Stop").setStyle(ButtonStyle.Danger)
    );
  }

  async render() {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${e.aki} Akinator`)
      .setDescription(`**Question ${this.aki.currentStep + 1}**\n\n${this.aki.question}`)
      .setFooter({ text: `Progress: ${Math.round(this.aki.progress)}%` });

    const components = [this.getButtons(), this.getUtilityButtons()];

    if (!this.message) {
      this.message = await (this.ctx.type === "prefix" ? this.ctx.message.reply({ embeds: [embed], components }) : this.ctx.interaction.reply({ embeds: [embed], components, fetchReply: true }));
      this.startCollector();
    } else {
      await this.message.edit({ embeds: [embed], components });
    }
  }

  async win() {
    const guess = this.aki.answers[0];
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle(`${e.aki} I've guessed it!`)
      .setDescription(`Is it **${guess.name}**?\n${guess.description}`)
      .setImage(guess.absolute_picture_path)
      .setFooter({ text: `Guessed in ${this.aki.currentStep} steps` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("yes").setLabel("Yes").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("no").setLabel("No").setStyle(ButtonStyle.Danger)
    );

    await this.message.edit({ embeds: [embed], components: [row] });
    if (this.collector) this.collector.stop();
    
    // Final collector for win/loss
    const filter = i => i.user.id === (this.ctx.type === "prefix" ? this.ctx.message.author.id : this.ctx.interaction.user.id);
    const finalCollector = this.message.createMessageComponentCollector({ filter, time: 30000, max: 1 });

    finalCollector.on("collect", async i => {
      if (i.customId === "yes") {
        await i.update({ content: `${e.aki} **Great! Guessed correctly once again.**`, embeds: [embed], components: [] });
      } else {
        await i.update({ content: `${e.aki} **You win! I couldn't guess it.**`, embeds: [], components: [] });
      }
    });
  }

  startCollector() {
    const userId = this.ctx.type === "prefix" ? this.ctx.message.author.id : this.ctx.interaction.user.id;
    const filter = i => i.user.id === userId;
    this.collector = this.message.createMessageComponentCollector({ filter, time: 600000 });

    this.collector.on("collect", async i => {
      if (i.customId === "stop") {
        await i.update({ content: `${e.aki} Game stopped.`, embeds: [], components: [] });
        return this.collector.stop();
      }
      if (i.customId === "back") {
        await i.deferUpdate();
        return this.back();
      }
      
      const answer = parseInt(i.customId);
      await i.deferUpdate();
      await this.step(answer);
    });

    this.collector.on("end", (_, reason) => {
      if (reason === "time") {
        this.message.edit({ content: `${e.aki} Game timed out.`, components: [] }).catch(() => null);
      }
    });
  }
}

module.exports = AkiGame;