const { SlashCommandBuilder } = require("discord.js");

// Import workers for direct execution
const workers = {
  "8ball":      require("./8ball"),
  "aki":        require("./aki"),
  "cat":        require("./cat"),
  "dog":        require("./dog"),
  "fact":       require("./fact"),
  "iq":         require("./iq"),
  "joke":       require("./joke"),
  "meme":       require("./meme"),
  "pp":         require("./pp"),
  "roast":      require("./roast"),
  "ship":       require("./ship"),
  "truthordare": require("./truthordare"),
  "guesswho":    require("./guesswho"),
};

module.exports = {
  name:             "fun",
  description:      "Master Fun & Games command.",
  category:         "fun",
  usage:            "/fun <action> [options]",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("fun")
    .setDescription("Various fun and game commands.")
    // Games
    .addSubcommand(s => s.setName("aki").setDescription("Play a game of Akinator.").addStringOption(o => o.setName("language").setDescription("The language to play in.").setRequired(false)).addStringOption(o => o.setName("mode").setDescription("What should Akinator guess?").addChoices({ name: "Character", value: "character" }, { name: "Animal", value: "animal" }, { name: "Object", value: "object" }).setRequired(false)))
    .addSubcommand(s => s.setName("guesswho").setDescription("Guess the anime character!"))
    .addSubcommand(s => s.setName("truthordare").setDescription("Play Truth or Dare!").addStringOption(o => o.setName("rating").setDescription("Rating of questions").addChoices({ name: "PG", value: "pg" }, { name: "PG13", value: "pg13" }, { name: "R", value: "r" })))
    .addSubcommand(s => s.setName("ship").setDescription("Matchmaking machine.").addUserOption(o => o.setName("user1").setDescription("First user").setRequired(true)).addUserOption(o => o.setName("user2").setDescription("Second user")))
    // Interaction/Random
    .addSubcommand(s => s.setName("8ball").setDescription("Ask the magic 8-ball.").addStringOption(o => o.setName("question").setDescription("Your question").setRequired(true)))
    .addSubcommand(s => s.setName("roast").setDescription("Roast someone.").addUserOption(o => o.setName("user").setDescription("The user to roast")))
    .addSubcommand(s => s.setName("iq").setDescription("Check someone's IQ.").addUserOption(o => o.setName("user").setDescription("The user to test")))
    .addSubcommand(s => s.setName("pp").setDescription("PP size rater.").addUserOption(o => o.setName("user").setDescription("The user to check")))
    // APIs
    .addSubcommand(s => s.setName("meme").setDescription("Get a random meme."))
    .addSubcommand(s => s.setName("joke").setDescription("Get a random joke."))
    .addSubcommand(s => s.setName("fact").setDescription("Get a random useless fact."))
    .addSubcommand(s => s.setName("cat").setDescription("Random cat picture."))
    .addSubcommand(s => s.setName("dog").setDescription("Random dog picture."))
    .toJSON(),

  async execute(client, ctx) {
    const action = ctx.interaction.options.getSubcommand();
    const worker = workers[action];

    if (!worker) return ctx.interaction.reply({ content: "Invalid fun action!", ephemeral: true });

    // Simply delegate execution to the worker file
    return worker.execute(client, ctx);
  },
};