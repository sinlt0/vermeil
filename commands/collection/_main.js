const { SlashCommandBuilder } = require("discord.js");

const workers = {
  "roll":      require("./roll"),
  "inventory": require("./inventory"),
  "wishlist":  require("./wishlist"),
  "divorce":   require("./divorce"),
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
    // Roll
    .addSubcommand(s => s.setName("roll").setDescription("Roll for a random character.")
      .addStringOption(o => o.setName("gender").setDescription("Filter by gender").addChoices({ name: "Male", value: "male" }, { name: "Female", value: "female" }))
    )
    // Inventory
    .addSubcommand(s => s.setName("inventory").setDescription("View your collected characters.").addUserOption(o => o.setName("user").setDescription("User to view collection of")))
    // Wishlist
    .addSubcommand(s => s.setName("wishlist").setDescription("Manage your wishlist.")
      .addStringOption(o => o.setName("action").setDescription("List, Add or Remove").addChoices({ name: "List", value: "list" }, { name: "Add", value: "add" }, { name: "Remove", value: "remove" }).setRequired(true))
      .addIntegerOption(o => o.setName("id").setDescription("Character ID (for add/remove)"))
    )
    // Divorce
    .addSubcommand(s => s.setName("divorce").setDescription("Remove a character from your collection.").addStringOption(o => o.setName("character").setDescription("Name or ID of character").setRequired(true)))
    .toJSON(),

  async execute(client, ctx) {
    const action = ctx.interaction.options.getSubcommand();
    const worker = workers[action];
    
    if (!worker) return ctx.interaction.reply({ content: "Invalid collection action!", ephemeral: true });

    return worker.execute(client, ctx);
  },
};