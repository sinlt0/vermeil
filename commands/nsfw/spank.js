const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "spank",
  description: "Spank a user (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "spank", title: "Spanked!", emoji: e.spank, type: "interaction", label: "spanked" });
  },
};