const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds = require("../../utils/embeds");
const { fromConnection } = require("../../models/GreetSettings");
const { sendGreetMessage, generateCard, buildGreetEmbed } = require("../../utils/greetUtils");

module.exports = {
  name: "greetconfig",
  description: "Configure the welcome and leave system.",
  category: "config",
  aliases: ["greet", "gconfig"],
  usage: "/greetconfig <subcommand>",
  cooldown: 5,
  requiresDatabase: true,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("greetconfig")
    .setDescription("Full configuration for welcome & leave system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName("setup")
        .setDescription("Set the channel for welcome or leave messages.")
        .addStringOption(o => o.setName("type").setDescription("Welcome or Leave?").setRequired(true).addChoices({ name: "Welcome", value: "welcome" }, { name: "Leave", value: "leave" }))
        .addChannelOption(o => o.setName("channel").setDescription("The channel to send messages in.").setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub =>
      sub.setName("toggle")
        .setDescription("Toggle features like cards, embeds, or DMs.")
        .addStringOption(o => o.setName("type").setDescription("Welcome or Leave?").setRequired(true).addChoices({ name: "Welcome", value: "welcome" }, { name: "Leave", value: "leave" }))
        .addStringOption(o => o.setName("feature").setDescription("Feature to toggle").setRequired(true).addChoices(
          { name: "System Enabled", value: "enabled" },
          { name: "Image Card", value: "cardEnabled" },
          { name: "Embed Message", value: "useEmbed" },
          { name: "DM Welcome (Welcome only)", value: "dmEnabled" }
        ))
    )
    .addSubcommand(sub =>
      sub.setName("message")
        .setDescription("Set the plain text message.")
        .addStringOption(o => o.setName("type").setDescription("Welcome or Leave?").setRequired(true).addChoices({ name: "Welcome", value: "welcome" }, { name: "Leave", value: "leave" }))
        .addStringOption(o => o.setName("text").setDescription("The message text (supports {user}, {server}, etc.)").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("embed")
        .setDescription("Customize the embed fields.")
        .addStringOption(o => o.setName("type").setDescription("Welcome or Leave?").setRequired(true).addChoices({ name: "Welcome", value: "welcome" }, { name: "Leave", value: "leave" }))
        .addStringOption(o => o.setName("field").setDescription("The field to update").setRequired(true).addChoices(
          { name: "Title", value: "title" },
          { name: "Description", value: "description" },
          { name: "Color (Hex)", value: "color" },
          { name: "Footer", value: "footer" },
          { name: "Author", value: "author" },
          { name: "Thumbnail URL", value: "thumbnail" },
          { name: "Image URL", value: "image" }
        ))
        .addStringOption(o => o.setName("value").setDescription("The new value (or 'clear' to remove)").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("background")
        .setDescription("Set a custom background for the image card.")
        .addStringOption(o => o.setName("type").setDescription("Welcome or Leave?").setRequired(true).addChoices({ name: "Welcome", value: "welcome" }, { name: "Leave", value: "leave" }))
        .addStringOption(o => o.setName("url").setDescription("The image URL (or 'reset' to use default)").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("preview")
        .setDescription("See how your current setup looks.")
        .addStringOption(o => o.setName("type").setDescription("Welcome or Leave?").setRequired(true).addChoices({ name: "Welcome", value: "welcome" }, { name: "Leave", value: "leave" }))
    )
    .addSubcommand(sub =>
      sub.setName("reset")
        .setDescription("Reset all greet settings to default.")
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const sub = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const GreetModel = fromConnection(guildDb.connection);
    let settings = await GreetModel.findOne({ guildId: guild.id });
    if (!settings) settings = await GreetModel.create({ guildId: guild.id });

    // ── RESET ──
    if (sub === "reset") {
      await GreetModel.deleteOne({ guildId: guild.id });
      return reply(ctx, { embeds: [embeds.success("All welcome/leave settings have been reset.")] });
    }

    const type = ctx.type === "prefix" ? ctx.args[1]?.toLowerCase() : ctx.interaction.options.getString("type");
    if (!["welcome", "leave"].includes(type) && sub !== "reset") {
      return reply(ctx, { embeds: [embeds.error("Please specify `welcome` or `leave`.")] });
    }

    // ── SETUP ──
    if (sub === "setup") {
      const channel = ctx.type === "prefix" ? ctx.message.mentions.channels.first() : ctx.interaction.options.getChannel("channel");
      if (!channel) return reply(ctx, { embeds: [embeds.error("Please provide a valid channel.")] });

      await GreetModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.channelId`]: channel.id, [`${type}.enabled`]: true } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`${type.toUpperCase()} system set to ${channel}.`)] });
    }

    // ── TOGGLE ──
    if (sub === "toggle") {
      const feature = ctx.type === "prefix" ? ctx.args[2] : ctx.interaction.options.getString("feature");
      if (!settings[type][feature] && settings[type][feature] !== false) {
         return reply(ctx, { embeds: [embeds.error(`Invalid feature. Valid: \`enabled\`, \`cardEnabled\`, \`useEmbed\`, \`dmEnabled\``)] });
      }

      const newState = !settings[type][feature];
      await GreetModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.${feature}`]: newState } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`**${feature}** for ${type} is now **${newState ? "enabled" : "disabled"}**.`)] });
    }

    // ── MESSAGE ──
    if (sub === "message") {
      const text = ctx.type === "prefix" ? ctx.args.slice(2).join(" ") : ctx.interaction.options.getString("text");
      if (!text) return reply(ctx, { embeds: [embeds.error("Please provide the message text.")] });

      await GreetModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.message`]: text } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`${type.toUpperCase()} message updated.`)] });
    }

    // ── EMBED ──
    if (sub === "embed") {
      const field = ctx.type === "prefix" ? ctx.args[2] : ctx.interaction.options.getString("field");
      const value = ctx.type === "prefix" ? ctx.args.slice(3).join(" ") : ctx.interaction.options.getString("value");
      
      if (!field || !value) return reply(ctx, { embeds: [embeds.error("Usage: `/greetconfig embed <type> <field> <value>`")] });

      const finalValue = value.toLowerCase() === "clear" ? null : value;

      await GreetModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.embed.${field}`]: finalValue } },
        { upsert: true }
      );

      return reply(ctx, { 
        embeds: [embeds.success(`**${field}** for ${type} embed has been updated.`)] 
      });
    }

    // ── BACKGROUND ──
    if (sub === "background") {
      const url = ctx.type === "prefix" ? ctx.args[2] : ctx.interaction.options.getString("url");
      const finalUrl = url.toLowerCase() === "reset" ? null : url;

      await GreetModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.cardBackground`]: finalUrl } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`${type.toUpperCase()} card background updated.`)] });
    }

    // ── PREVIEW ──
    if (sub === "preview") {
      const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
      await reply(ctx, { content: `✨ Generating your ${type} preview...` });

      const config = settings[type];
      try {
        let card = null;
        if (config.cardEnabled) card = await generateCard(member, type, config.cardBackground);
        
        const embed = config.useEmbed ? await buildGreetEmbed(config, member, type, card) : null;
        
        const payload = { content: config.message ? `**Message Preview:**\n${config.message}` : null };
        if (embed) payload.embeds = [embed];
        if (card)  payload.files = [card];

        if (ctx.type === "prefix") ctx.message.channel.send(payload);
        else ctx.interaction.followUp(payload);
      } catch (err) {
        return reply(ctx, { embeds: [embeds.error(`Preview failed: ${err.message}`)] });
      }
    }
  },
};
