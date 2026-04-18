const chalk = require("chalk");
const { EmbedBuilder, WebhookClient } = require("discord.js");

/**
 * Advanced Error Handler Utility
 */
module.exports = (client) => {
  const logError = (type, err) => {
    console.error(chalk.red.bold(`\n❌ [${type}] Error Detected:`));
    console.error(chalk.red(err.stack || err));

    // Optional: Log to a dedicated error channel via Webhook if configured
    if (process.env.ERROR_WEBHOOK) {
      const webhook = new WebhookClient({ url: process.env.ERROR_WEBHOOK });
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle(`Bot Error: ${type}`)
        .setDescription(`\`\`\`js\n${(err.stack || err).slice(0, 2000)}\n\`\`\``)
        .setTimestamp();
      
      webhook.send({ embeds: [embed] }).catch(() => null);
    }
  };

  // ── Process-Level Handlers ─────────────────────────────
  // These ensure the bot DOES NOT crash on unhandled logic errors
  
  process.on("unhandledRejection", (reason, promise) => {
    logError("Unhandled Rejection", reason);
  });

  process.on("uncaughtException", (err, origin) => {
    // Check if error is truly fatal (e.g., memory leak, syntax in main loop)
    logError("Uncaught Exception", err);
    
    // We only exit if it's NOT a standard Discord/Node error
    if (err.message.includes("TOKEN_INVALID")) {
      console.error(chalk.bgRed.white(" FATAL: Invalid Token. Shutting down... "));
      process.exit(1);
    }
  });

  process.on("uncaughtExceptionMonitor", (err, origin) => {
    logError("Exception Monitor", err);
  });

  // ── Discord.js Specific Handlers ───────────────────────
  
  client.on("error", (err) => {
    logError("Discord Client Error", err);
  });

  client.on("warn", (info) => {
    console.warn(chalk.yellow(`\n⚠️ [Discord Warning] ${info}`));
  });

  // Rate Limit Handling
  client.rest.on("rateLimited", (info) => {
    console.warn(chalk.magenta(`\n⏳ [Rate Limit] ${info.method} ${info.path} | Timeout: ${info.timeout}ms | Limit: ${info.limit}`));
  });

  console.log(chalk.green("  [Handler] ✅ Advanced Error Handler active."));
};