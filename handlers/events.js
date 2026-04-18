// ============================================================
//  handlers/events.js
//  Recursively loads all events from events/
//  Supports emitter field for riffy events:
//    emitter: "riffy" → attaches to client.riffy
//    (default)        → attaches to client (Discord.js)
//
//  Fix: all riffy events collected first, attached in ONE
//  single ready listener to avoid MaxListeners warning
// ============================================================
const fs    = require("fs");
const path  = require("path");
const chalk = require("chalk");

module.exports = (client) => {
  // Increase max listeners to be safe
  client.setMaxListeners(20);

  const eventsDir = path.join(__dirname, "../events");
  let loaded = 0, failed = 0;

  console.log(chalk.yellow.bold("📡  [Events] Loading..."));

  const riffyQueue = []; // collect all riffy events here

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(fullPath); continue; }
      if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

      try {
        delete require.cache[require.resolve(fullPath)];
        const event = require(fullPath);

        if (!event.name || !event.execute) {
          console.warn(chalk.yellow(`  [Events] Skipped: ${entry.name}`));
          continue;
        }

        const listener = (...args) => event.execute(client, ...args);

        if (event.emitter === "riffy") {
          // Queue for attachment in single ready listener
          riffyQueue.push({ event, listener });
        } else {
          // Normal Discord.js event
          if (event.once) client.once(event.name, listener);
          else            client.on(event.name, listener);
        }

        loaded++;
      } catch (err) {
        console.error(chalk.red(`  [Events] Error loading ${entry.name}:`), err.message);
        failed++;
      }
    }
  };

  walk(eventsDir);

  // ── Attach ALL riffy events in a single ready listener ──
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
