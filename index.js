// ============================================================
//  index.js — Entry point
// ============================================================
require("dotenv").config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Add a custom user agent for libraries that use axios/fetch
process.env.USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const { Client, Collection } = require("discord.js");
const { intents, partials }  = require("./utils/intents");
const config = require("./config");
const chalk  = require("chalk");

// ── Resolve token from .env or config.js ─────────────────
const TOKEN     = process.env.TOKEN || config.token;
const MONGO_URI = process.env.MONGODB_URI || null; // null = use cluster array from config

// ── Client ────────────────────────────────────────────────
const client = new Client({ intents, partials });

// ── Error Handling ────────────────────────────────────────
require("./utils/errorHandler")(client);

// ── Client-level collections & config ─────────────────────
client.commands   = new Collection(); // name  → command object
client.aliases    = new Collection(); // alias → command name
client.slashCmds  = new Collection(); // name  → command object (slash)
client.cooldowns  = new Collection();
client.config     = config;
client.token      = TOKEN;
client.mongoURI   = MONGO_URI;        // single URI override (optional env)
// client.db will be attached by the database handler

// ── Load all handlers then login ─────────────────────────
const loadHandlers = require("./handlers/handlerLoader");

(async () => {
  try {
    await loadHandlers(client);
    await client.login(TOKEN);
  } catch (err) {
    console.error(chalk.red.bold("\n❌  Fatal error during startup:"), err.message);
    process.exit(1);
  }
})();

module.exports = client;