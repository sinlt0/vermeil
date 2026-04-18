const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "bite",
  description: "Bite a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "bite", label: "bit", emoji: e.bite });
  },
};