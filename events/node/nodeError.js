const chalk = require("chalk");
module.exports = {
  name:     "nodeError",
  emitter:  "riffy",
  once:     false,
  execute(client, node, error) {
    console.error(chalk.red(`  [Music] ⚠️  Node error on ${node.name}:`), error.message);
  },
};
