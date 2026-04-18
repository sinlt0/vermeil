const { SlashCommandBuilder } = require("discord.js");

const workers = {
  "bot":     require("./botinfo"),
  "invite":  require("./invite"),
  "server":  require("./serverinfo"),
  "support": require("./supportserver"),
  "user":    require("./userinfo"),
};

module.exports = {
  name:             "info",
  description:      "Master information command.",
  category:         "info",
  usage:            "/info <subcommand>",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("info")
    .setDescription("Get information about the bot, server, or users.")
    .addSubcommand(s => s.setName("bot").setDescription("View bot statistics and info."))
    .addSubcommand(s => s.setName("invite").setDescription("Get the bot's invite link."))
    .addSubcommand(s => s.setName("server").setDescription("View server information."))
    .addSubcommand(s => s.setName("support").setDescription("Join our support server."))
    .addSubcommand(s => s.setName("user").setDescription("View user information.").addUserOption(o => o.setName("user").setDescription("User to view info for.")))
    .toJSON(),

  async execute(client, ctx) {
    const action = ctx.interaction.options.getSubcommand();
    const worker = workers[action];
    
    if (!worker) return ctx.interaction.reply({ content: "Invalid info action!", ephemeral: true });

    return worker.execute(client, ctx);
  },
};