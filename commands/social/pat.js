const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "pat",
  description: "Pat a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("pat")
    .setDescription("Pat a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to pat.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "pat", label: "patted", emoji: e.pat });
  },
};