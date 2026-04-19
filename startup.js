/**
 * Vermeil Startup & Autoupdate System
 * Designed for Pterodactyl / VPS hosting
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const log = (msg) => console.log(`\x1b[35m[Startup]\x1b[0m ${msg}`);

const REPO_URL = "https://github.com/sinlt0/vermeil.git";

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

// ── 1. Update or Initialize Git ──────────────────────────
if (!fs.existsSync(path.join(__dirname, ".git"))) {
  log("No .git folder found. Initializing repository...");
  if (runCommand("git init")) {
    runCommand(`git remote add origin ${REPO_URL}`);
    log(`Remote set to ${REPO_URL}`);
    
    // Attempt to pull current files to establish link
    log("Fetching remote data...");
    runCommand("git fetch origin");
    runCommand("git reset --hard origin/main"); // Force sync with main branch
  }
} else {
  log("Checking for GitHub updates...");
  runCommand("git pull origin main");
}

// ── 2. Install Dependencies ──────────────────────────────

runCommand("npm install")

// ── 3. Start the Bot ─────────────────────────────────────
log("Ready to boot. Launching index.js...");
console.log("\x1b[36m============================================================\x1b[0m\n");

try {
  require("./index.js");
} catch (err) {
  console.error("\x1b[31m[Fatal]\x1b[0m Failed to start index.js:");
  console.error(err);
  process.exit(1);
}
