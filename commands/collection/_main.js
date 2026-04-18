const { SlashCommandBuilder, ChannelType } = require("discord.js");

const workers = {
  "roll":      require("./roll"),
  "inventory": require("./inventory"),
  "wishlist":  require("./wishlist"),
  "divorce":   require("./divorce"),
  "config":    require("./collconfig"),
  "charinfo":  require("./charinfo"),
  "favorite":  require("./favorite"),
  "timers":    require("./timers"),
  "topserv":   require("./top"),
  "gift":      require("./gift"),
  "trade":     require("./trade"),
};

module.exports = {
  name:             "collection",
  description:      "Master anime character collection command.",
  category:         "collection",
  usage:            "/collection <subcommand>",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("collection")
    .setDescription("Collect and manage your anime characters.")
    // Core
    .addSubcommand(s => s.setName("roll").setDescription("Roll for a random character.").addStringOption(o => o.setName("gender").setDescription("Filter by gender").addChoices({ name: "Male", value: "male" }, { name: "Female", value: "female" })))
    .addSubcommand(s => s.setName("inventory").setDescription("View your collected characters.").addUserOption(o => o.setName("user").setDescription("User to view collection of")))
    // Social
    .addSubcommand(s => s.setName("gift").setDescription("Gift a character to another user.").addUserOption(o => o.setName("user").setDescription("Recipient").setRequired(true)).addStringOption(o => o.setName("character").setDescription("Name or ID of character").setRequired(true)))
    .addSubcommand(s => s.setName("trade").setDescription("Trade characters with another user.").addUserOption(o => o.setName("user").setDescription("User to trade with").setRequired(true)).addStringOption(o => o.setName("details").setDescription("Your Character | Their Character").setRequired(true)))
    // Management
    .addSubcommand(s => s.setName("wishlist").setDescription("Manage your wishlist.").addStringOption(o => o.setName("action").setDescription("List, Add or Remove").addChoices({ name: "List", value: "list" }, { name: "Add", value: "add" }, { name: "Remove", value: "remove" }).setRequired(true)).addIntegerOption(o => o.setName("id").setDescription("Character ID (for add/remove)")))
    .addSubcommand(s => s.setName("divorce").setDescription("Remove a character from your collection.").addStringOption(o => o.setName("character").setDescription("Name or ID of character").setRequired(true)))
    .addSubcommand(s => s.setName("favorite").setDescription("Set your favorite character.").addStringOption(o => o.setName("character").setDescription("Name or ID").setRequired(true)))
    // Info
    .addSubcommand(s => s.setName("charinfo").setDescription("View info about a character.").addStringOption(o => o.setName("query").setDescription("Name or ID").setRequired(true)))
    .addSubcommand(s => s.setName("timers").setDescription("Check your cooldowns."))
    .addSubcommand(s => s.setName("topserv").setDescription("View top collected characters."))
    // Config
    .addSubcommand(s => s.setName("config").setDescription("Configure system settings.").addChannelOption(o => o.setName("channel").setDescription("Set the spawn channel").addChannelTypes(ChannelType.GuildText)).addIntegerOption(o => o.setName("roll_minutes").setDescription("Minutes between roll resets")).addIntegerOption(o => o.setName("claim_minutes").setDescription("Minutes between claim resets")))
    .toJSON(),

  async execute(client, ctx) {
    const action = ctx.interaction.options.getSubcommand();
    const worker = workers[action];
    
    if (!worker) return ctx.interaction.reply({ content: "Invalid collection action!", ephemeral: true });

    return worker.execute(client, ctx);
  },
};