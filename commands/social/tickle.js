const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "tickle",
  description: "Tickle a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("tickle")
    .setDescription("Tickle a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to tickle.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "tickle", label: "tickled", emoji: e.tickle });
  },
};