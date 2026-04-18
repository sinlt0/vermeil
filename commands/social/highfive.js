const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "highfive",
  description: "Give someone a high-five!",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "highfive", label: "high-fived", emoji: e.highfive });
  },
};