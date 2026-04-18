const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "smile",
  description: "Smile at someone!",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "smile", label: "smiled at", emoji: e.smile });
  },
};