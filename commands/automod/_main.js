const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");

const workers = {
  settings:  require("./automod"),
  blacklist: require("./blacklist"),
  heat:      require("./heat"),
  gate:      require("./joingate"),
  raid:      require("./joinraid"),
};

module.exports = {
  name:             "automod",
  description:      "Master AutoMod configuration command.",
  category:         "automod",
  usage:            "/automod <module> [subcommand] [options]",
  cooldown:         5,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Full control over your server's Auto-Moderation system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    
    // ── MODULE: Core Settings ──
    .addSubcommandGroup(g => g.setName("settings").setDescription("General AutoMod configuration.")
      .addSubcommand(s => s.setName("overview").setDescription("View current AutoMod status."))
      .addSubcommand(s => s.setName("logchannel").setDescription("Set the AutoMod log channel.").addChannelOption(o => o.setName("channel").setDescription("Channel for logs").setRequired(true).addChannelTypes(ChannelType.GuildText)))
      .addSubcommand(s => s.setName("filter").setDescription("Toggle a specific filter.").addStringOption(o => o.setName("name").setDescription("Filter to toggle").setRequired(true).addChoices({name:"Invites",value:"invites"},{name:"Malicious",value:"malicious"},{name:"Everyone",value:"everyone"},{name:"Webhooks",value:"webhooks"},{name:"Delete Trigger",value:"delete"})).addStringOption(o => o.setName("state").setDescription("On or Off?").setRequired(true).addChoices({name:"On",value:"?on"},{name:"Off",value:"?off"})))
    )

    // ── MODULE: Blacklist ──
    .addSubcommandGroup(g => g.setName("blacklist").setDescription("Manage words and links.")
      .addSubcommand(s => s.setName("add").setDescription("Add to blacklist.").addStringOption(o => o.setName("type").setDescription("Word or Link?").setRequired(true).addChoices({name:"Word",value:"word"},{name:"Link",value:"link"})).addStringOption(o => o.setName("value").setDescription("The word or URL").setRequired(true)))
      .addSubcommand(s => s.setName("remove").setDescription("Remove from blacklist.").addStringOption(o => o.setName("type").setDescription("Word or Link?").setRequired(true).addChoices({name:"Word",value:"word"},{name:"Link",value:"link"})).addStringOption(o => o.setName("value").setDescription("The word or URL").setRequired(true)))
      .addSubcommand(s => s.setName("list").setDescription("View active blacklists.").addStringOption(o => o.setName("type").setDescription("Word or Link?").setRequired(true).addChoices({name:"Word",value:"word"},{name:"Link",value:"link"})))
    )

    // ── MODULE: Heat (Spam) ──
    .addSubcommandGroup(g => g.setName("heat").setDescription("Anti-spam and rapid-message protection.")
      .addSubcommand(s => s.setName("view").setDescription("View heat settings."))
      .addSubcommand(s => s.setName("toggle").setDescription("Toggle master heat or spam filters.").addStringOption(o => o.setName("slot").setDescription("1 (Master) or 2 (Spam)").setRequired(true).addChoices({name:"[1] Master",value:"1"},{name:"[2] Anti-Spam",value:"2"})).addStringOption(o => o.setName("state").setDescription("On or Off?").setRequired(true).addChoices({name:"On",value:"?on"},{name:"Off",value:"?off"})))
      .addSubcommand(s => s.setName("set").setDescription("Adjust a numeric setting.").addIntegerOption(o => o.setName("slot").setDescription("Setting slot (3-8)").setRequired(true).addChoices({name:"[3] Max Heat",value:3},{name:"[4] Degradation",value:4},{name:"[5] Strike Timeout",value:5},{name:"[6] Cap Timeout",value:6},{name:"[7] Cap Count",value:7},{name:"[8] Multiplier",value:8})).addNumberOption(o => o.setName("value").setDescription("The numeric value").setRequired(true)))
    )

    // ── MODULE: Gate (Anti-Alt) ──
    .addSubcommandGroup(g => g.setName("gate").setDescription("Join Gate / Anti-Alt protection.")
      .addSubcommand(s => s.setName("view").setDescription("View gate settings."))
      .addSubcommand(s => s.setName("toggle").setDescription("Toggle a gate filter.").addStringOption(o => o.setName("slot").setDescription("Gate slot (e.g. 1, 2, 4a)").setRequired(true)).addStringOption(o => o.setName("state").setDescription("On or Off?").setRequired(true).addChoices({name:"On",value:"?on"},{name:"Off",value:"?off"})))
    )

    // ── MODULE: Raid (Anti-Raid) ──
    .addSubcommandGroup(g => g.setName("raid").setDescription("Join Raid detection.")
      .addSubcommand(s => s.setName("view").setDescription("View raid settings."))
      .addSubcommand(s => s.setName("off").setDescription("Manually end an active raid."))
      .addSubcommand(s => s.setName("toggle").setDescription("Enable/Disable join raid.").addStringOption(o => o.setName("state").setDescription("On or Off?").setRequired(true).addChoices({name:"On",value:"?on"},{name:"Off",value:"?off"})))
    )
    .toJSON(),

  async execute(client, ctx) {
    const group  = ctx.interaction.options.getSubcommandGroup();
    const sub    = ctx.interaction.options.getSubcommand();
    
    // Bridge logic: translate Slash options into ctx.args for worker files
    const worker = workers[group || sub];
    if (!worker) return ctx.interaction.reply({ content: "Module not found.", ephemeral: true });

    // ── Prep standard ARGS for workers ──
    if (group === "settings") {
      if (sub === "overview")   ctx.args = [];
      if (sub === "logchannel") ctx.args = ["logchannel", ctx.interaction.options.getChannel("channel").id];
      if (sub === "filter")     ctx.args = ["filter", ctx.interaction.options.getString("name"), ctx.interaction.options.getString("state")];
    } 
    else if (group === "blacklist") {
      ctx.args = [ctx.interaction.options.getString("type"), sub, ctx.interaction.options.getString("value") || ""];
    }
    else if (group === "heat") {
      if (sub === "view")   ctx.args = [];
      if (sub === "toggle") ctx.args = [ctx.interaction.options.getString("slot"), ctx.interaction.options.getString("state")];
      if (sub === "set")    ctx.args = [ctx.interaction.options.getNumber("value").toString(), "?set", ctx.interaction.options.getInteger("slot").toString()];
    }
    else if (group === "gate") {
      if (sub === "view")   ctx.args = [];
      if (sub === "toggle") ctx.args = [ctx.interaction.options.getString("slot"), ctx.interaction.options.getString("state")];
    }
    else if (group === "raid") {
      if (sub === "view")   ctx.args = [];
      if (sub === "off")    ctx.args = ["off"];
      if (sub === "toggle") ctx.args = ["1", ctx.interaction.options.getString("state")];
    }

    // Call the original worker's execute function
    return worker.execute(client, ctx);
  },
};