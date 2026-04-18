// ============================================================
//  events/client/error.js
//  Catches Discord client-level errors so the bot doesn't crash
// ============================================================
const chalk = require("chalk");

module.exports = {
  name: "error",
  once: false,

  execute(client, error) {
    console.error(chalk.red.bold("\n[Client Error]"), error.message);
  },
};
