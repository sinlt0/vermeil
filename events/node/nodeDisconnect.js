const chalk = require("chalk");
module.exports = {
  name:     "nodeDisconnect",
  emitter:  "riffy",
  once:     false,
  execute(client, node, reason) {
    console.log(chalk.red(`  [Music] ❌ Node disconnected: ${node.name} — ${reason?.message ?? "unknown"}`));
  },
};
