const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

const workers = {
  setup:  require("./setup"),
  lock:   require("./lock"),
  unlock: require("./unlock"),
  hide:   require("./hide"),
  unhide: require("./unhide"),
  limit:  require("./limit"),
  rename: require("./rename"),
  claim:  require("./claim"),
};

module.exports = {
  name:             "voicemaster",
  description:      "Master Join-to-Create voice system command.",
  category:         "voicemaster",
  aliases:          ["vm", "voice"],
  usage:            "/voicemaster <subcommand>",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("voicemaster")
    .setDescription("Manage your temporary voice channels.")
    // Admin
    .addSubcommand(s => s.setName("setup").setDescription("Set up the Join-to-Create system.")
      .addChannelOption(o => o.setName("channel").setDescription("The Join-to-Create channel").setRequired(true).addChannelTypes(ChannelType.GuildVoice))
      .addChannelOption(o => o.setName("category").setDescription("The parent category").addChannelTypes(ChannelType.GuildCategory)))
    // Privacy
    .addSubcommand(s => s.setName("lock").setDescription("Lock your channel."))
    .addSubcommand(s => s.setName("unlock").setDescription("Unlock your channel."))
    .addSubcommand(s => s.setName("hide").setDescription("Hide your channel."))
    .addSubcommand(s => s.setName("unhide").setDescription("Unhide your channel."))
    // Customization
    .addSubcommand(s => s.setName("limit").setDescription("Set user limit.").addIntegerOption(o => o.setName("limit").setDescription("Max users (0-99)").setRequired(true).setMinValue(0).setMaxValue(99)))
    .addSubcommand(s => s.setName("rename").setDescription("Rename your channel.").addStringOption(o => o.setName("name").setDescription("New name").setRequired(true)))
    .addSubcommand(s => s.setName("claim").setDescription("Claim ownership of the current channel."))
    .toJSON(),

  async execute(client, ctx) {
    const sub = ctx.interaction.options.getSubcommand();
    const worker = workers[sub];
    
    if (!worker) return ctx.interaction.reply({ content: "Invalid subcommand!", ephemeral: true });

    return worker.execute(client, ctx);
  },
};