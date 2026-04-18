const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "yuri",
  description: "Get random NSFW yuri content.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "yuri", title: "Yuri", emoji: "👭" });
  },
};