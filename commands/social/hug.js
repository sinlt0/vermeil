const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "hug",
  description: "Hug a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Hug a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to hug.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "hug", label: "hugged", emoji: e.hug });
  },
};