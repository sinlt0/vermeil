const fs    = require("fs");
const path  = require("path");
const chalk = require("chalk");

module.exports = (client) => {
  client.setMaxListeners(30);

  const eventsDir = path.join(__dirname, "../events");
  let loaded = 0, failed = 0;

  console.log(chalk.yellow.bold("📡  [Events] Loading..."));

  const riffyQueue = [];

  const registerEvent = (event) => {
    if (!event.name || !event.execute) return false;
    const listener = (...args) => event.execute(client, ...args);
    if (event.emitter === "riffy") {
      riffyQueue.push({ event, listener });
    } else {
      if (event.once) client.once(event.name, listener);
      else            client.on(event.name, listener);
    }
    loaded++;
    return true;
  };

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

      try {
        delete require.cache[require.resolve(fullPath)];
        const exported = require(fullPath);

        // Support both single event object AND array of events
        if (Array.isArray(exported)) {
          for (const event of exported) {
            const ok = registerEvent(event);
            if (!ok) console.warn(chalk.yellow(`  [Events] Skipped entry in: ${entry.name}`));
          }
        } else {
          const ok = registerEvent(exported);
          if (!ok) console.warn(chalk.yellow(`  [Events] Skipped: ${entry.name}`));
        }
      } catch (err) {
        console.error(chalk.red(`  [Events] Error loading ${entry.name}:`), err.message);
        failed++;
      }
    }
  };

  walk(eventsDir);

  if (riffyQueue.length > 0) {
    client.once("ready", () => {
      if (!client.riffy) {
        console.warn(chalk.yellow("  [Events] Riffy not initialized — skipping riffy event attachment."));
        return;
      }
      for (const { event, listener } of riffyQueue) {
        if (event.once) client.riffy.once(event.name, listener);
        else            client.riffy.on(event.name, listener);
        console.log(chalk.cyan(`  [Events] Riffy event attached: ${event.name}`));
      }
    });
  }

  console.log(
    chalk.green(`  [Events] Loaded: ${loaded}`) +
    (failed ? chalk.red(`  |  Failed: ${failed}`) : "") + "\n"
  );
};
