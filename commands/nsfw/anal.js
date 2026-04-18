const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "anal",
  description: "Anal interaction (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "anal", title: "Anal!", emoji: "🍑", type: "interaction", label: "is going anal on" });
  },
};