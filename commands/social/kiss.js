const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "kiss",
  description: "Kiss a user.",
  category: "social",
  usage: "<user>",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("kiss")
    .setDescription("Kiss a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to kiss.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "kiss", label: "kissed", emoji: e.kiss });
  },
};