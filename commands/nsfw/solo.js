const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "solo",
  description: "Get random NSFW solo images.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "solo", title: "Solo", emoji: e.solo });
  },
};