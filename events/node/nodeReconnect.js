const chalk = require("chalk");
module.exports = {
  name:     "nodeReconnect",
  emitter:  "riffy",
  once:     false,
  execute(client, node) {
    console.log(chalk.yellow(`  [Music] 🔄 Node reconnecting: ${node.name}`));
  },
};
