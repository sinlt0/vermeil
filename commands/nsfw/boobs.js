const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "boobs",
  description: "Get random boobs images (Anime or IRL).",
  category: "nsfw",
  usage: "[irl]",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "boobs", title: "Boobs", emoji: e.boobs, type: "dual" });
  },
};