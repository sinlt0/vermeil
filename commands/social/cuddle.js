const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "cuddle",
  description: "Cuddle a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("cuddle")
    .setDescription("Cuddle a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to cuddle.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "cuddle", label: "cuddled", emoji: e.cuddle });
  },
};