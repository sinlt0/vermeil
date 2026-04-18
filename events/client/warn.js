// ============================================================
//  events/client/warn.js
//  Logs Discord client warnings
// ============================================================
const chalk = require("chalk");

module.exports = {
  name: "warn",
  once: false,

  execute(client, info) {
    console.warn(chalk.yellow(`[Client Warn] ${info}`));
  },
};
