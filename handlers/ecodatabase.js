// ============================================================
//  handlers/ecodatabase.js
//  Global Economy MongoDB Connection
//  Fixed: models attached AFTER connection resolves
// ============================================================
const mongoose = require("mongoose");
const chalk    = require("chalk");
const config   = require("../config");
const path     = require("path");
const fs       = require("fs");

let ecoConnection = null;
const modelRegistry = new Map();

module.exports = async (client) => {
  console.log(chalk.cyan.bold("💰 [EcoDatabase] Initializing economy database..."));

  const ecoUri = config.mongodb?.economyUri || config.mongodb?.ecoUri;

  if (!ecoUri) {
    console.warn(chalk.yellow("  [EcoDB] ⚠️  No economyUri found in config.mongodb — skipping economy DB."));
    return;
  }

  try {
    ecoConnection = mongoose.createConnection(ecoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
      maxPoolSize:               50,
      minPoolSize:               10,
      retryWrites:               true,
      w:                         "majority",
    });

    ecoConnection.on("disconnected", () => console.warn(chalk.red("  [EcoDB] ❌ Disconnected")));
    ecoConnection.on("error",        (err) => console.error(chalk.red("  [EcoDB] ⚠️ Error:"), err.message));
    ecoConnection.on("reconnected",  () => console.log(chalk.green("  [EcoDB] ✅ Reconnected")));

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Connection timeout")), 15000);
      ecoConnection.once("connected", () => { clearTimeout(timer); resolve(); });
      ecoConnection.once("error",     (err) => { clearTimeout(timer); reject(err); });
    });

    console.log(chalk.green("  [EcoDB] ✅ Connected to economy database"));

    // ── Load models AFTER connection is ready ─────────────
    loadModels();

    // ── Attach to client AFTER models are loaded ──────────
    client.ecoDb = {
      connection:  ecoConnection,
      models:      Object.fromEntries(modelRegistry),
      getModel:    (name) => modelRegistry.get(name),
      listModels:  () => Array.from(modelRegistry.keys()),
      health:      checkHealth,
      isReady:     () => ecoConnection?.readyState === 1,
    };

    console.log(chalk.green.bold(`  [EcoDB] ✅ Ready — ${modelRegistry.size} models loaded.\n`));

  } catch (err) {
    console.error(chalk.red.bold("  [EcoDB] ❌ Failed to connect:"), err.message);
    client.ecoDb = null;
  }
};

// ── Load all schemas from /ecomodels/ ─────────────────────
function loadModels() {
  const dir = path.join(__dirname, "../ecomodels");
  if (!fs.existsSync(dir)) {
    console.warn(chalk.yellow("  [EcoDB] ⚠️  ecomodels/ folder not found"));
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js") && !f.startsWith("."));

  for (const file of files) {
    try {
      const exported = require(path.join(dir, file));
      const schema   = exported.default || exported;
      const name     = toPascalCase(file.replace(".js", ""));

      if (!(schema instanceof mongoose.Schema)) {
        console.warn(chalk.yellow(`  [EcoDB] ⚠️  ${file} does not export a valid Schema`));
        continue;
      }

      // Avoid duplicate model registration on hot reload
      const model = ecoConnection.models[name]
        ? ecoConnection.models[name]
        : ecoConnection.model(name, schema);

      modelRegistry.set(name, model);
      console.log(chalk.gray(`  [EcoDB] 📦 ${name}`));
    } catch (err) {
      console.error(chalk.red(`  [EcoDB] ❌ Error loading ${file}:`), err.message);
    }
  }
}

function toPascalCase(str) {
  return str.split(/[-_]/).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("");
}

async function checkHealth() {
  if (!ecoConnection) return { status: "disconnected", readyState: 0, modelsLoaded: 0 };
  return {
    status:       ecoConnection.readyState === 1 ? "healthy" : "unhealthy",
    readyState:   ecoConnection.readyState,
    modelsLoaded: modelRegistry.size,
  };
}

async function gracefulShutdown() {
  if (!ecoConnection) return;
  console.log(chalk.yellow("  [EcoDB] 🛑 Closing economy connection..."));
  await ecoConnection.close();
  console.log(chalk.green("  [EcoDB] ✅ Economy connection closed"));
}

module.exports.shutdown = gracefulShutdown;
