const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds = require("../../utils/embeds");
const { fromConnection: BoosterConfig } = require("../../models/BoosterConfig");
const { generateBoosterCard, buildBoosterEmbed } = require("../../utils/boosterUtils");

module.exports = {
  name: "boosterconfig",
  description: "Configure the booster system.",
  category: "booster",
  aliases: ["boostconfig", "bconfig"],
  usage: "/boosterconfig <subcommand>",
  cooldown: 5,
  requiresDatabase: true,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("boosterconfig")
    .setDescription("Full configuration for the booster system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub.setName("setup")
        .setDescription("Set the channel for boost messages.")
        .addStringOption(o => o.setName("type").setDescription("Boost or Unboost?").setRequired(true).addChoices({ name: "Boost", value: "boost" }, { name: "Unboost", value: "unboost" }))
        .addChannelOption(o => o.setName("channel").setDescription("The channel to send messages in.").setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub =>
      sub.setName("toggle")
        .setDescription("Toggle features like cards or embeds.")
        .addStringOption(o => o.setName("type").setDescription("Boost or Unboost?").setRequired(true).addChoices({ name: "Boost", value: "boost" }, { name: "Unboost", value: "unboost" }))
        .addStringOption(o => o.setName("feature").setDescription("Feature to toggle").setRequired(true).addChoices(
          { name: "System Enabled", value: "enabled" },
          { name: "Image Card (Boost only)", value: "cardEnabled" },
          { name: "Embed Message", value: "useEmbed" }
        ))
    )
    .addSubcommand(sub =>
      sub.setName("message")
        .setDescription("Set the plain text message.")
        .addStringOption(o => o.setName("type").setDescription("Boost or Unboost?").setRequired(true).addChoices({ name: "Boost", value: "boost" }, { name: "Unboost", value: "unboost" }))
        .addStringOption(o => o.setName("text").setDescription("The message text (supports {user}, {boostcount}, etc.)").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("embed")
        .setDescription("Customize the embed fields.")
        .addStringOption(o => o.setName("type").setDescription("Boost or Unboost?").setRequired(true).addChoices({ name: "Boost", value: "boost" }, { name: "Unboost", value: "unboost" }))
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
      sub.setName("rolereward")
        .setDescription("Set a role reward for a specific boost count.")
        .addIntegerOption(o => o.setName("count").setDescription("The number of boosts required.").setRequired(true).setMinValue(1))
        .addRoleOption(o => o.setName("role").setDescription("The role to give (leave empty to remove)").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("customrole")
        .setDescription("Configure custom role settings for boosters.")
        .addStringOption(o => o.setName("setting").setDescription("The setting to change").setRequired(true).addChoices(
          { name: "Toggle Enabled", value: "enabled" },
          { name: "Boost Requirement", value: "requirement" },
          { name: "Anchor Role", value: "anchor" },
          { name: "Anchor Position", value: "position" }
        ))
        .addStringOption(o => o.setName("value").setDescription("The new value").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("preview")
        .setDescription("See how your current setup looks.")
        .addStringOption(o => o.setName("type").setDescription("Boost or Unboost?").setRequired(true).addChoices({ name: "Boost", value: "boost" }, { name: "Unboost", value: "unboost" }))
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const sub = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ConfigModel = BoosterConfig(guildDb.connection);
    let settings = await ConfigModel.findOne({ guildId: guild.id });
    if (!settings) settings = await ConfigModel.create({ guildId: guild.id });

    const type = ctx.type === "prefix" ? ctx.args[1]?.toLowerCase() : ctx.interaction.options.getString("type");

    // ── SETUP ──
    if (sub === "setup") {
      const channel = ctx.type === "prefix" ? ctx.message.mentions.channels.first() : ctx.interaction.options.getChannel("channel");
      if (!channel) return reply(ctx, { embeds: [embeds.error("Please provide a valid channel.")] });

      await ConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.channelId`]: channel.id, [`${type}.enabled`]: true } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`${type.toUpperCase()} system set to ${channel}.`)] });
    }

    // ── TOGGLE ──
    if (sub === "toggle") {
      const feature = ctx.type === "prefix" ? ctx.args[2] : ctx.interaction.options.getString("feature");
      const newState = !settings[type][feature];
      await ConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.${feature}`]: newState } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`**${feature}** for ${type} is now **${newState ? "enabled" : "disabled"}**.`)] });
    }

    // ── MESSAGE ──
    if (sub === "message") {
      const text = ctx.type === "prefix" ? ctx.args.slice(2).join(" ") : ctx.interaction.options.getString("text");
      await ConfigModel.findOneAndUpdate(
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
      const finalValue = value.toLowerCase() === "clear" ? null : value;

      await ConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $set: { [`${type}.embed.${field}`]: finalValue } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`**${field}** for ${type} embed updated.`)] });
    }

    // ── ROLE REWARD ──
    if (sub === "rolereward") {
      const count = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("count");
      const role = ctx.type === "prefix" ? ctx.message.mentions.roles.first() : ctx.interaction.options.getRole("role");

      if (!count) return reply(ctx, { embeds: [embeds.error("Please specify the boost count.")] });

      if (!role) {
        // Remove reward
        settings.roleRewards.delete(count.toString());
        await settings.save();
        return reply(ctx, { embeds: [embeds.success(`Removed role reward for ${count} boosts.`)] });
      } else {
        // Add reward
        settings.roleRewards.set(count.toString(), role.id);
        await settings.save();
        return reply(ctx, { embeds: [embeds.success(`Set role reward for ${count} boosts: ${role}.`)] });
      }
    }

    // ── CUSTOM ROLE ──
    if (sub === "customrole") {
      const setting = ctx.type === "prefix" ? ctx.args[1]?.toLowerCase() : ctx.interaction.options.getString("setting");
      const value = ctx.type === "prefix" ? ctx.args.slice(2).join(" ") : ctx.interaction.options.getString("value");

      if (!setting || !value) return reply(ctx, { embeds: [embeds.error("Usage: `/boosterconfig customrole <setting> <value>`")] });

      switch (setting) {
        case "enabled": {
          const newState = ["true", "on", "yes", "enable"].includes(value.toLowerCase());
          await ConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { customRoleEnabled: newState } });
          return reply(ctx, { embeds: [embeds.success(`Custom booster roles are now **${newState ? "enabled" : "disabled"}**.`)] });
        }
        case "requirement": {
          const req = parseInt(value);
          if (isNaN(req) || req < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid number (1 or more).")] });
          await ConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { customRoleRequirement: req } });
          return reply(ctx, { embeds: [embeds.success(`Custom roles now require **${req}** boost(s).`)] });
        }
        case "anchor": {
          const role = ctx.type === "prefix" ? (ctx.message.mentions.roles.first() || guild.roles.cache.get(value)) : guild.roles.cache.get(value);
          if (!role) return reply(ctx, { embeds: [embeds.error("Please provide a valid role ID or mention.")] });
          await ConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { customRoleAnchorId: role.id } });
          return reply(ctx, { embeds: [embeds.success(`Custom roles will be placed relative to ${role}.`)] });
        }
        case "position": {
          const pos = value.toLowerCase();
          if (!["above", "below"].includes(pos)) return reply(ctx, { embeds: [embeds.error("Position must be either `above` or `below`.")] });
          await ConfigModel.findOneAndUpdate({ guildId: guild.id }, { $set: { customRolePosition: pos } });
          return reply(ctx, { embeds: [embeds.success(`Custom roles will be placed **${pos}** the anchor role.`)] });
        }
        default:
          return reply(ctx, { embeds: [embeds.error("Invalid setting. Use: `enabled`, `requirement`, `anchor`, `position`")] });
      }
    }

    // ── PREVIEW ──
    if (sub === "preview") {
      const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
      await reply(ctx, { content: `✨ Generating your ${type} preview...` });

      const config = settings[type];
      try {
        let card = null;
        if (config.cardEnabled && type === "boost") card = await generateBoosterCard(member, 1, config.cardBackground);
        
        const embed = config.useEmbed ? await buildBoosterEmbed(config, member, 1, card) : null;
        
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
