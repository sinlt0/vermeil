const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "blush",
  description: "Blush!",
  category: "social",
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("blush")
    .setDescription("Blush!")
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "blush", label: "is blushing", emoji: e.blush, requiresTarget: false });
  },
};