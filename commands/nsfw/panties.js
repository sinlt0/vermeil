const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "panties",
  description: "Get random anime panty images.",
  category: "nsfw",
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "panties", title: "Panties", emoji: "👙" });
  },
};