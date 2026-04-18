const { SlashCommandBuilder } = require("discord.js");
const { executeSocial } = require("../../utils/social/socialBase");
const e = require("../../emojis/socialemoji");

module.exports = {
  name: "dance",
  description: "Dance around!",
  category: "social",
  usage: "",
  cooldown: 3,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("dance")
    .setDescription("Dance around!")
    .toJSON(),

  async execute(client, ctx) {
    return executeSocial(client, ctx, { action: "dance", label: "is dancing", emoji: e.dance, requiresTarget: false });
  },
};