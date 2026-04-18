const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "nsfwwaifu",
  description: "Get a random NSFW waifu image.",
  category: "nsfw",
  aliases: ["waifu"],
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "waifu", title: "Waifu", emoji: e.waifu });
  },
};