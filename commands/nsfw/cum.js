const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "cum",
  description: "Cum on someone (NSFW).",
  category: "nsfw",
  usage: "<user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "cum", title: "Cum!", emoji: e.cum, type: "interaction", label: "cummed on" });
  },
};