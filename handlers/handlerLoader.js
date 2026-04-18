// ============================================================
//  handlers/handlerLoader.js
//  Master loader — runs handlers in the correct order:
//  1. database   2. commands   3. events   4. slashDeploy
//  Then picks up any remaining handlers (flat or categorised)
// ============================================================
const fs    = require("fs");
const path  = require("path");
const chalk = require("chalk");

// These run first, in this exact order
const PRIORITY = ["database.js","ecodatabase.js", "commands.js", "events.js","slashDeploy.js"];

module.exports = async (client) => {
  const dir = __dirname;

  console.log(chalk.magenta.bold("\n🚀  Starting Bot...\n"));

  // ── Pass 1: Priority handlers ────────────────────────────
  for (const file of PRIORITY) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) continue;
    try {
      const handler = require(filePath);
      if (typeof handler === "function") await handler(client);
    } catch (err) {
      console.error(chalk.red(`  [HandlerLoader] Failed to load ${file}:`), err.message);
    }
  }

  // ── Pass 2: Any remaining handlers (flat + sub-folders) ──
  const walk = (current) => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (
        entry.isFile() &&
        entry.name.endsWith(".js") &&
        fullPath !== __filename &&
        !PRIORITY.includes(entry.name)
      ) {
        try {
          const handler = require(fullPath);
          if (typeof handler === "function") {
            handler(client);
            console.log(chalk.cyan(`  [Handler] Loaded: ${path.relative(dir, fullPath)}`));
          }
        } catch (err) {
          console.error(chalk.red(`  [Handler] Failed: ${entry.name}:`), err.message);
        }
      }
    }
  };

  walk(dir);

  console.log(chalk.magenta.bold("\n✨  All handlers initialised.\n"));
};
