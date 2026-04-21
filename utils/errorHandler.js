const chalk = require("chalk");
const { sendWebhookLog } = require("./loggingUtils");

/**
 * Advanced Error Handler Utility
 */
module.exports = (client) => {
  const logError = (type, err) => {
    const stack = err.stack || err.toString();
    console.error(chalk.red.bold(`\n❌ [${type}] Error Detected:`));
    console.error(chalk.red(stack));

    // Send to Webhook
    sendWebhookLog("errors", {
      title: `🚨 Bot Error: ${type}`,
      description: `\`\`\`js\n${stack.slice(0, 2000)}\n\`\`\``,
      color: 0xED4245
    });
  };

  // ── Process-Level Handlers ─────────────────────────────
  
  process.on("unhandledRejection", (reason) => {
    logError("Unhandled Rejection", reason);
  });

  process.on("uncaughtException", (err) => {
    logError("Uncaught Exception", err);
    if (err.message.includes("TOKEN_INVALID")) {
      process.exit(1);
    }
  });

  // ── Discord.js Specific Handlers ───────────────────────
  
  client.on("error", (err) => logError("Discord Client Error", err));

  client.on("warn", (info) => {
    console.warn(chalk.yellow(`\n⚠️ [Discord Warning] ${info}`));
    sendWebhookLog("console", {
      title: "⚠️ Discord Warning",
      description: info,
      color: 0xFEE75C
    });
  });

  // Rate Limit Handling
  client.rest.on("rateLimited", (info) => {
    const msg = `${info.method} ${info.path} | Timeout: ${info.timeout}ms`;
    console.warn(chalk.magenta(`\n⏳ [Rate Limit] ${msg}`));
    sendWebhookLog("console", {
      title: "⏳ Rate Limited",
      description: msg,
      color: 0xEB459E
    });
  });

  console.log(chalk.green("  [Handler] ✅ Advanced Error Handler active."));
  
  // Log Startup
  client.once("ready", () => {
    sendWebhookLog("console", {
      title: "🚀 Bot Started",
      description: `Logged in as **${client.user.tag}**\nServing **${client.guilds.cache.size}** servers.`,
      color: 0x57F287
    });
  });
};