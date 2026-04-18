const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "thighs",
  description: "Get random anime thigh images.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "thighs", title: "Thighs", emoji: "🍗" });
  },
};