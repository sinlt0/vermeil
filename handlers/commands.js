// ============================================================
//  handlers/commands.js
//  Recursively loads all commands from commands/
//  Supports both:
//    commands/{file.js}
//    commands/{category}/{file.js}
// ============================================================
const fs    = require("fs");
const path  = require("path");
const chalk = require("chalk");

module.exports = (client) => {
  const commandsDir = path.join(__dirname, "../commands");
  let loaded = 0;
  let failed = 0;

  console.log(chalk.yellow.bold("🔧  [Commands] Loading..."));

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

      try {
        // Clear cache so hot-reloads work cleanly if ever needed
        delete require.cache[require.resolve(fullPath)];
        const cmd = require(fullPath);

        // ── Validate ────────────────────────────────────────
        if (!cmd.name) {
          console.warn(chalk.yellow(`  [Commands] Skipped (no name): ${entry.name}`));
          continue;
        }

        // ── Infer category from folder if not explicitly set ─
        if (!cmd.category) {
          const parentFolder = path.basename(path.dirname(fullPath));
          cmd.category = parentFolder === "commands" ? "general" : parentFolder;
        }

        // ── Register prefix command ──────────────────────────
        client.commands.set(cmd.name.toLowerCase(), cmd);

        // ── Register aliases ─────────────────────────────────
        if (Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            client.aliases.set(alias.toLowerCase(), cmd.name.toLowerCase());
          }
        }

        // ── Register slash command (opt-out with slash: false) ─
        if (cmd.slash !== false && cmd.slashData) {
          client.slashCmds.set(cmd.name.toLowerCase(), cmd);
        }

        loaded++;
      } catch (err) {
        console.error(chalk.red(`  [Commands] Error loading ${entry.name}:`), err.message);
        failed++;
      }
    }
  };

  walk(commandsDir);

  console.log(
    chalk.green(`  [Commands] Loaded: ${loaded}`) +
    (failed ? chalk.red(`  |  Failed: ${failed}`) : "") +
    "\n"
  );
};
