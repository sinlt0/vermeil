// ============================================================
//  commands/economy/heist.js
// ============================================================
const { ecoCheck }  = require("../../utils/ecoMiddleware");
const { getHeist, joinHeist, startHeist } = require("../../utils/eco/heistManager");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "heist", description: "Start or join a heist!", category: "economy",
  aliases: [], usage: "[join]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const sub = ctx.args[0]?.toLowerCase();

    if (sub === "join") {
      const heist = getHeist(message.guild.id);
      if (!heist) return message.reply(`${eco.error} No active heist! Start one with \`!heist\`.`);
      const result = joinHeist(message.guild.id, message.author.id, message.author.tag);
      if (result.error) return message.reply(`${eco.error} ${result.error}`);
      return message.reply(`${eco.success} You joined the heist! (${result.heist.members.length} members)`);
    }

    // Start heist
    const existing = getHeist(message.guild.id);
    if (existing) return message.reply(`${eco.error} A heist is already in progress! Use \`!heist join\` to participate.`);

    return startHeist(client, message, message.member);
  },
};
