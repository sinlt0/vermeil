const { SlashCommandBuilder } = require("discord.js");

const workers = {
  "avatar":   require("./avatar"),
  "banner":   require("./banner"),
  "calc":     require("./calc"),
  "choose":   require("./choose"),
  "coinflip": require("./coinflip"),
  "ping":     require("./ping"),
  "reminder": require("./reminder"),
  "svavatar": require("./svavatar"),
  "svbanner": require("./svbanner"),
};

module.exports = {
  name:             "utility",
  description:      "Master utility command.",
  category:         "utility",
  usage:            "/utility <subcommand>",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("utility")
    .setDescription("Various helpful utility tools.")
    .addSubcommand(s => s.setName("ping").setDescription("Check the bot's latency."))
    .addSubcommand(s => s.setName("avatar").setDescription("View a user's avatar.").addUserOption(o => o.setName("user").setDescription("User to view avatar of")))
    .addSubcommand(s => s.setName("banner").setDescription("View a user's banner.").addUserOption(o => o.setName("user").setDescription("User to view banner of")))
    .addSubcommand(s => s.setName("calc").setDescription("Perform a calculation.").addStringOption(o => o.setName("expression").setDescription("Math expression e.g. 10 + 5").setRequired(true)))
    .addSubcommand(s => s.setName("choose").setDescription("Pick between options.").addStringOption(o => o.setName("options").setDescription("Comma separated list of choices").setRequired(true)))
    .addSubcommand(s => s.setName("coinflip").setDescription("Flip a coin."))
    .addSubcommand(s => s.setName("reminder").setDescription("Set a reminder.").addStringOption(o => o.setName("time").setDescription("Time e.g. 10m, 1h").setRequired(true)).addStringOption(o => o.setName("reason").setDescription("What to remind you about").setRequired(true)))
    .addSubcommand(s => s.setName("svavatar").setDescription("View server avatar.").addUserOption(o => o.setName("user").setDescription("User to view avatar of")))
    .addSubcommand(s => s.setName("svbanner").setDescription("View server banner.").addUserOption(o => o.setName("user").setDescription("User to view banner of")))
    .toJSON(),

  async execute(client, ctx) {
    const action = ctx.interaction.options.getSubcommand();
    const worker = workers[action];
    
    if (!worker) return ctx.interaction.reply({ content: "Invalid utility action!", ephemeral: true });

    return worker.execute(client, ctx);
  },
};