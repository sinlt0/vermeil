// ============================================================
//  utils/ecoMiddleware.js
//  Reusable checks for economy commands
// ============================================================
const { isEcoReady, ecoError, hasStarted } = require("./ecoUtils");
const eco = require("../emojis/ecoemoji");

async function ecoCheck(client, message) {
  if (!isEcoReady(client)) {
    await message.reply({ embeds: [ecoError("Economy system is unavailable right now.")] });
    return false;
  }
  if (!(await hasStarted(client, message.author.id))) {
    await message.reply({ embeds: [ecoError(`You haven't started yet! Use \`!start\` to begin your economy journey.`)] });
    return false;
  }
  return true;
}

module.exports = { ecoCheck };
