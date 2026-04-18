/**
 * Vermeil Startup & Autoupdate System
 * Designed for Pterodactyl / VPS hosting
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const log = (msg) => console.log(`\x1b[35m[Startup]\x1b[0m ${msg}`);

console.log("\x1b[36m============================================================\x1b[0m");
log("Vermeil Autoupdate System initialized.");

function runCommand(cmd) {
  try {
    execSync(cmd, { stdio: "inherit" });
    return true;
  } catch (err) {
    console.error(`\x1b[31m[Error]\x1b[0m Command failed: ${cmd}`);
    return false;
  }
}

// ── 1. Update from GitHub ────────────────────────────────
if (fs.existsSync(path.join(__dirname, ".git"))) {
  log("Checking for GitHub updates...");
  runCommand("git pull");
} else {
  log("No .git folder found. Skipping auto-update.");
}

// ── 2. Install Dependencies ──────────────────────────────
// Runs if node_modules is missing or if you want to ensure they are up to date
if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  log("Dependencies missing. Running npm install...");
  runCommand("npm install --omit=dev");
}

// ── 3. Start the Bot ─────────────────────────────────────
log("Ready to boot. Launching index.js...");
console.log("\x1b[36m============================================================\x1b[0m\n");

// We use require to boot the bot in the same process
try {
  require("./index.js");
} catch (err) {
  console.error("\x1b[31m[Fatal]\x1b[0m Failed to start index.js:");
  console.error(err);
  process.exit(1);
}
