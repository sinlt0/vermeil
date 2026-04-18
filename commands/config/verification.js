// ============================================================
//  commands/verification/verification.js
//  All verification subcommands:
//  set-verified, set-unverified, set-channel, set-type,
//  set-retrylimit, set-image, update-unverified, update-embed
// ============================================================
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { reply }                              = require("../../utils/commandRunner");
const embeds                                 = require("../../utils/embeds");
const emoji                                  = require("../../emojis/verifyemoji");
const { fromConnection: VerificationConfig } = require("../../models/VerificationConfig");
const {
  generateVerifyCard,
  buildVerifyEmbed,
  buildVerifyRow,
} = require("../../utils/verifyUtils");

module.exports = {
  name:             "verification",
  description:      "Configure the verification system.",
  category:         "config",
  aliases:          ["verify"],
  usage:            "<subcommand>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("verification")
    .setDescription("Configure the verification system.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(s => s.setName("set-verified")
      .setDescription("Set the role given to verified members.")
      .addRoleOption(o => o.setName("role").setDescription("Verified role.").setRequired(true))
    )
    .addSubcommand(s => s.setName("set-unverified")
      .setDescription("Auto-create the Unverified role and lock all channels except verification channel.")
    )
    .addSubcommand(s => s.setName("set-channel")
      .setDescription("Set the verification channel and send the verification embed.")
      .addChannelOption(o => o.setName("channel").setDescription("Verification channel.").addChannelTypes(ChannelType.GuildText).setRequired(true))
    )
    .addSubcommand(s => s.setName("set-type")
      .setDescription("Set the verification type.")
      .addStringOption(o => o.setName("type").setDescription("Verification type.").setRequired(true)
        .addChoices(
          { name: "One-Click (just click a button)", value: "oneclick" },
          { name: "Captcha (solve a captcha)",       value: "captcha"  },
        ))
    )
    .addSubcommand(s => s.setName("set-retrylimit")
      .setDescription("Set how many captcha attempts before kick.")
      .addIntegerOption(o => o.setName("limit").setDescription("Max attempts (default: 3).").setRequired(true).setMinValue(1).setMaxValue(10))
    )
    .addSubcommand(s => s.setName("set-image")
      .setDescription("Set a custom image for the verification embed.")
      .addStringOption(o => o.setName("url").setDescription("Image URL (leave empty to use default canvas image).").setRequired(false))
    )
    .addSubcommand(s => s.setName("update-unverified")
      .setDescription("Fix unverified role permissions — remove view access from all channels except verification channel.")
    )
    .addSubcommand(s => s.setName("update-embed")
      .setDescription("Resend the verification embed (if accidentally deleted).")
    )
    .addSubcommand(s => s.setName("enable").setDescription("Enable the verification system."))
    .addSubcommand(s => s.setName("disable").setDescription("Disable the verification system."))
    .addSubcommand(s => s.setName("view").setDescription("View current verification configuration."))
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const VerifyModel = VerificationConfig(guildDb.connection);
    const sub         = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    const upsert = async (data) => VerifyModel.findOneAndUpdate(
      { guildId: guild.id },
      { $set: data, $setOnInsert: { guildId: guild.id } },
      { upsert: true, new: true }
    );

    // ── ENABLE ────────────────────────────────────────
    if (sub === "enable") {
      const config = await VerifyModel.findOne({ guildId: guild.id });
      if (!config?.verifiedRoleId)  return reply(ctx, { embeds: [embeds.error("Please set a verified role first using `/verification set-verified`.")] });
      if (!config?.unverifiedRoleId) return reply(ctx, { embeds: [embeds.error("Please set up the unverified role first using `/verification set-unverified`.")] });
      if (!config?.channelId)       return reply(ctx, { embeds: [embeds.error("Please set a verification channel first using `/verification set-channel`.")] });
      await upsert({ enabled: true });
      return reply(ctx, { embeds: [embeds.success("Verification system has been **enabled**.", `${emoji.shield} Verification Enabled`)] });
    }

    // ── DISABLE ───────────────────────────────────────
    if (sub === "disable") {
      await upsert({ enabled: false });
      return reply(ctx, { embeds: [embeds.success("Verification system has been **disabled**.", `${emoji.shield} Verification Disabled`)] });
    }

    // ── SET-VERIFIED ──────────────────────────────────
    if (sub === "set-verified") {
      const role = ctx.type === "prefix"
        ? ctx.message.mentions.roles.first()
        : ctx.interaction.options.getRole("role");
      if (!role) return reply(ctx, { embeds: [embeds.error("Please provide a valid role.")] });
      await upsert({ verifiedRoleId: role.id });
      return reply(ctx, { embeds: [embeds.success(`Verified role set to ${role}.`, `${emoji.role} Verified Role Set`)] });
    }

    // ── SET-UNVERIFIED ────────────────────────────────
    if (sub === "set-unverified") {
      await ctx.type === "slash" ? ctx.interaction.deferReply() : null;

      const config = await VerifyModel.findOne({ guildId: guild.id });

      // Create Unverified role
      let unverifiedRole = guild.roles.cache.find(r => r.name === "Unverified");
      if (!unverifiedRole) {
        unverifiedRole = await guild.roles.create({
          name:        "Unverified",
          color:       0x99AAB5,
          reason:      "Auto-created by verification system",
          permissions: [],
        });
      }

      // Remove view channel from ALL channels except verification channel
      let updated = 0;
      for (const [, channel] of guild.channels.cache) {
        // Skip verification channel
        if (config?.channelId && channel.id === config.channelId) continue;
        // Skip category channels
        if (channel.type === 4) continue;

        try {
          await channel.permissionOverwrites.edit(unverifiedRole.id, {
            ViewChannel: false,
          });
          updated++;
        } catch {}
      }

      // If verification channel exists, give unverified VIEW access to it
      if (config?.channelId) {
        const verifyChannel = guild.channels.cache.get(config.channelId);
        if (verifyChannel) {
          await verifyChannel.permissionOverwrites.edit(unverifiedRole.id, {
            ViewChannel:        true,
            SendMessages:       false,
            AddReactions:       false,
            UseApplicationCommands: false,
          }).catch(() => {});
        }
      }

      await upsert({ unverifiedRoleId: unverifiedRole.id });

      const msg = `${emoji.role} **Unverified** role created and permissions set.\n\`ViewChannel\` removed from **${updated}** channels.`;
      if (ctx.type === "slash") return ctx.interaction.editReply({ embeds: [embeds.success(msg, `${emoji.lock} Unverified Role Setup`)] });
      return reply(ctx, { embeds: [embeds.success(msg, `${emoji.lock} Unverified Role Setup`)] });
    }

    // ── SET-CHANNEL ───────────────────────────────────
    if (sub === "set-channel") {
      const channel = ctx.type === "prefix"
        ? ctx.message.mentions.channels.first()
        : ctx.interaction.options.getChannel("channel");
      if (!channel) return reply(ctx, { embeds: [embeds.error("Please provide a valid channel.")] });

      if (ctx.type === "slash") await ctx.interaction.deferReply({ ephemeral: true });

      await upsert({ channelId: channel.id });
      const config = await VerifyModel.findOne({ guildId: guild.id });

      // Set permissions for unverified role on this channel
      if (config?.unverifiedRoleId) {
        await channel.permissionOverwrites.edit(config.unverifiedRoleId, {
          ViewChannel:            true,
          SendMessages:           false,
          AddReactions:           false,
          UseApplicationCommands: false,
        }).catch(() => {});
      }

      // Send verification embed
      const messageId = await sendVerifyEmbed(client, guild, channel, config);
      if (messageId) await upsert({ messageId });

      const msg = `Verification channel set to ${channel}. Embed has been sent.`;
      if (ctx.type === "slash") return ctx.interaction.editReply({ embeds: [embeds.success(msg, `${emoji.channel} Channel Set`)] });
      return reply(ctx, { embeds: [embeds.success(msg, `${emoji.channel} Channel Set`)] });
    }

    // ── SET-TYPE ──────────────────────────────────────
    if (sub === "set-type") {
      const type = ctx.type === "prefix" ? ctx.args[1]?.toLowerCase() : ctx.interaction.options.getString("type");
      if (!["oneclick", "captcha"].includes(type)) {
        return reply(ctx, { embeds: [embeds.error("Invalid type. Use `oneclick` or `captcha`.")] });
      }
      await upsert({ type });
      const label = type === "captcha" ? "Captcha" : "One-Click";
      return reply(ctx, { embeds: [embeds.success(`Verification type set to **${label}**.`, `${emoji.shield} Type Set`)] });
    }

    // ── SET-RETRYLIMIT ────────────────────────────────
    if (sub === "set-retrylimit") {
      const limit = ctx.type === "prefix" ? parseInt(ctx.args[1]) : ctx.interaction.options.getInteger("limit");
      if (!limit || limit < 1 || limit > 10) return reply(ctx, { embeds: [embeds.error("Limit must be between 1 and 10.")] });
      await upsert({ retryLimit: limit });
      return reply(ctx, { embeds: [embeds.success(`Captcha retry limit set to **${limit}** attempt${limit !== 1 ? "s" : ""}. Exceeding this will kick the user.`, `${emoji.retry} Retry Limit Set`)] });
    }

    // ── SET-IMAGE ─────────────────────────────────────
    if (sub === "set-image") {
      const url = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("url");
      await upsert({ imageUrl: url ?? null });
      return reply(ctx, { embeds: [embeds.success(url ? `Custom image set.` : "Reset to default canvas image.", `${emoji.image} Image Set`)] });
    }

    // ── UPDATE-UNVERIFIED ─────────────────────────────
    if (sub === "update-unverified") {
      if (ctx.type === "slash") await ctx.interaction.deferReply();

      const config = await VerifyModel.findOne({ guildId: guild.id });
      if (!config?.unverifiedRoleId) return reply(ctx, { embeds: [embeds.error("No unverified role found. Run `/verification set-unverified` first.")] });

      let updated = 0;
      for (const [, channel] of guild.channels.cache) {
        if (config.channelId && channel.id === config.channelId) continue;
        if (channel.type === 4) continue;
        try {
          await channel.permissionOverwrites.edit(config.unverifiedRoleId, { ViewChannel: false });
          updated++;
        } catch {}
      }

      // Re-set verification channel permissions
      if (config.channelId) {
        const verifyChannel = guild.channels.cache.get(config.channelId);
        if (verifyChannel) {
          await verifyChannel.permissionOverwrites.edit(config.unverifiedRoleId, {
            ViewChannel: true, SendMessages: false, AddReactions: false, UseApplicationCommands: false,
          }).catch(() => {});
        }
      }

      const msg = `${emoji.lock} Permissions fixed on **${updated}** channels for the Unverified role.`;
      if (ctx.type === "slash") return ctx.interaction.editReply({ embeds: [embeds.success(msg, `${emoji.shield} Permissions Updated`)] });
      return reply(ctx, { embeds: [embeds.success(msg, `${emoji.shield} Permissions Updated`)] });
    }

    // ── UPDATE-EMBED ──────────────────────────────────
    if (sub === "update-embed") {
      if (ctx.type === "slash") await ctx.interaction.deferReply({ ephemeral: true });

      const config = await VerifyModel.findOne({ guildId: guild.id });
      if (!config?.channelId) return reply(ctx, { embeds: [embeds.error("No verification channel set. Use `/verification set-channel` first.")] });

      const channel = guild.channels.cache.get(config.channelId);
      if (!channel) return reply(ctx, { embeds: [embeds.error("Verification channel not found.")] });

      // Delete old embed if exists
      if (config.messageId) {
        const old = await channel.messages.fetch(config.messageId).catch(() => null);
        if (old) await old.delete().catch(() => {});
      }

      const messageId = await sendVerifyEmbed(client, guild, channel, config);
      if (messageId) await upsert({ messageId });

      const msg = `Verification embed resent in ${channel}.`;
      if (ctx.type === "slash") return ctx.interaction.editReply({ embeds: [embeds.success(msg, `${emoji.shield} Embed Updated`)] });
      return reply(ctx, { embeds: [embeds.success(msg, `${emoji.shield} Embed Updated`)] });
    }

    // ── VIEW ──────────────────────────────────────────
    if (sub === "view") {
      const config = await VerifyModel.findOne({ guildId: guild.id });
      const embed  = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle(`${emoji.shield} Verification Configuration`)
        .addFields(
          { name: "Status",        value: config?.enabled ? "✅ Enabled" : "❌ Disabled",                                             inline: true  },
          { name: "Type",          value: config?.type === "captcha" ? "🔢 Captcha" : "👆 One-Click",                                 inline: true  },
          { name: "Retry Limit",   value: `${config?.retryLimit ?? 3} attempts`,                                                      inline: true  },
          { name: "Verified Role", value: config?.verifiedRoleId ? `<@&${config.verifiedRoleId}>` : "*(not set)*",                   inline: true  },
          { name: "Unverified Role",value: config?.unverifiedRoleId ? `<@&${config.unverifiedRoleId}>` : "*(not set)*",              inline: true  },
          { name: "Channel",       value: config?.channelId ? `<#${config.channelId}>` : "*(not set)*",                              inline: true  },
          { name: "Custom Image",  value: config?.imageUrl ? `[View Image](${config.imageUrl})` : "Default canvas",                  inline: false },
        )
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand.")] });
  },
};

// ============================================================
//  Helper — send verification embed to channel
// ============================================================
async function sendVerifyEmbed(client, guild, channel, config) {
  try {
    const embed = await buildVerifyEmbed(guild, config ?? {}, client);
    const row   = buildVerifyRow();

    let msg;
    if (!config?.imageUrl) {
      const card = await generateVerifyCard(client);
      msg = await channel.send({ embeds: [embed], files: [card], components: [row] });
    } else {
      msg = await channel.send({ embeds: [embed], components: [row] });
    }

    return msg.id;
  } catch (err) {
    console.error("[Verification] sendVerifyEmbed error:", err.message);
    return null;
  }
}
