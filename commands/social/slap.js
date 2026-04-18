const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "slap",
  description: "Slap a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("slap")
    .setDescription("Slap a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to slap.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "slap", label: "slapped", emoji: e.slap });
  },
};