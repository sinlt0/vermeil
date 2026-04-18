const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "pussy",
  description: "Get random pussy images (Anime or IRL).",
  category: "nsfw",
  usage: "[irl]",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "pussy", title: "Pussy", emoji: "🍑", type: "dual" });
  },
};