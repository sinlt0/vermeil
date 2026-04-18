const chalk = require("chalk");
module.exports = {
  name:     "nodeConnect",
  emitter:  "riffy",
  once:     false,
  execute(client, node) {
    console.log(chalk.green(`  [Music] ✅ Node connected: ${node.name}`));
  },
};
