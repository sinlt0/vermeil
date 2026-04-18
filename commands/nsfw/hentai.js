const { executeNsfw } = require("../../utils/nsfw/nsfwBase");
const e = require("../../emojis/nsfwemoji");

module.exports = {
  name: "hentai",
  description: "Get a random hentai image.",
  category: "nsfw",
  aliases: ["h"],
  usage: "",
  cooldown: 3,
  slash: false,

  async execute(client, ctx) {
    return executeNsfw(client, ctx, { category: "hentai", title: "Hentai", emoji: e.hentai });
  },
};