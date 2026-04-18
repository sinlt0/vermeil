const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "smug",
  description: "Show how smug you are.",
  category: "social",
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("smug")
    .setDescription("Show how smug you are.")
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "smug", label: "is feeling smug", emoji: e.smug, requiresTarget: false });
  },
};