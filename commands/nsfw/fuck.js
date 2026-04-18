const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "fuck",
  description: "Fuck a user (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "fuck", title: "Fucked!", emoji: "👉", type: "interaction", label: "is fucking" });
  },
};