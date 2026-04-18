const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "bj",
  description: "Give someone a blowjob (NSFW).",
  category: "nsfw",
  aliases: ["blowjob"],
  usage: "<user>",
  cooldown: 5,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "bj", title: "Blowjob!", emoji: e.bj, type: "interaction", label: "is giving a blowjob to" });
  },
};