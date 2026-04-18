const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "lesbian",
  description: "Get random lesbian content.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "lesbian", title: "Lesbian", emoji: "👭" });
  },
};