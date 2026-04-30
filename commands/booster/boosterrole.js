const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds = require("../../utils/embeds");
const { fromConnection: BoosterConfig } = require("../../models/BoosterConfig");
const { fromConnection: BoosterMember } = require("../../models/BoosterMember");

module.exports = {
  name: "boosterrole",
  description: "Claim and customize your custom booster role.",
  category: "booster",
  aliases: ["br", "customrole"],
  usage: "/boosterrole <subcommand>",
  cooldown: 5,
  requiresDatabase: true,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("boosterrole")
    .setDescription("Manage your custom booster role.")
    .addSubcommand(sub =>
      sub.setName("claim")
        .setDescription("Claim your custom role.")
        .addStringOption(o => o.setName("name").setDescription("The name of the role").setRequired(true))
        .addStringOption(o => o.setName("color").setDescription("The hex color for the role").setRequired(false))
        .addAttachmentOption(o => o.setName("icon").setDescription("The image for the role (Requires Level 2 Boost)").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("name")
        .setDescription("Change your custom role name.")
        .addStringOption(o => o.setName("name").setDescription("The new name").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("color")
        .setDescription("Change your custom role color.")
        .addStringOption(o => o.setName("color").setDescription("The new hex color").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("icon")
        .setDescription("Change your custom role icon (Requires Level 2 Boost).")
        .addAttachmentOption(o => o.setName("icon").setDescription("The new image icon").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("delete")
        .setDescription("Delete your custom role.")
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;
    const sub = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ConfigModel = BoosterConfig(guildDb.connection);
    const MemberModel = BoosterMember(guildDb.connection);

    const config = await ConfigModel.findOne({ guildId: guild.id });
    if (!config || !config.customRoleEnabled) {
      return reply(ctx, { embeds: [embeds.error("Custom booster roles are currently disabled in this server.")] });
    }

    // Check if user is boosting and meets requirement
    let memberData = await MemberModel.findOne({ guildId: guild.id, userId: member.id });
    const isBoosting = !!member.premiumSince;
    const boostCount = memberData ? memberData.boostCount : (isBoosting ? 1 : 0);

    if (boostCount < config.customRoleRequirement) {
      return reply(ctx, { 
        embeds: [embeds.error(`You need at least **${config.customRoleRequirement}** boost(s) to use this. You have **${boostCount}**.`)] 
      });
    }

    // ── CLAIM ──
    if (sub === "claim") {
      if (memberData?.customRoleId && guild.roles.cache.has(memberData.customRoleId)) {
        return reply(ctx, { embeds: [embeds.error("You already have a custom role! Use `/boosterrole name` or `/boosterrole color` to edit it.")] });
      }

      const name = ctx.type === "prefix" ? ctx.args.slice(1).join(" ") : ctx.interaction.options.getString("name");
      const color = ctx.type === "prefix" ? ctx.args[ctx.args.length - 1] : ctx.interaction.options.getString("color");
      
      const roleOptions = {
        name: name || `${member.user.username}'s Role`,
        reason: `Custom booster role for ${member.user.tag}`,
      };

      if (color && /^#([0-9a-f]{3}){1,2}$/i.test(color)) {
        roleOptions.color = color;
      }

      // Handle Icon in Claim
      const icon = ctx.type === "prefix" ? ctx.message.attachments.first() : ctx.interaction.options.getAttachment("icon");
      if (icon) {
        if (guild.premiumTier < 2) {
          return reply(ctx, { embeds: [embeds.error("Role icons require the server to be **Boost Level 2**. This role will be created without an icon.")] });
        }
        roleOptions.icon = icon.url;
      }

      try {
        const newRole = await guild.roles.create(roleOptions);
        
        // Handle positioning
        if (config.customRoleAnchorId) {
          const anchorRole = guild.roles.cache.get(config.customRoleAnchorId);
          if (anchorRole) {
            const targetPos = config.customRolePosition === "above" ? anchorRole.position + 1 : anchorRole.position - 1;
            await newRole.setPosition(targetPos).catch(() => {});
          }
        }

        await member.roles.add(newRole);

        if (!memberData) {
          await MemberModel.create({ guildId: guild.id, userId: member.id, customRoleId: newRole.id, boostCount });
        } else {
          memberData.customRoleId = newRole.id;
          await memberData.save();
        }

        return reply(ctx, { embeds: [embeds.success(`Your custom role **${newRole.name}** has been created!`)] });
      } catch (err) {
        console.error("[BoosterRole] Create Error:", err);
        return reply(ctx, { embeds: [embeds.error(`Failed to create role: ${err.message}`)] });
      }
    }

    // From here on, member MUST have a custom role
    if (!memberData?.customRoleId || !guild.roles.cache.has(memberData.customRoleId)) {
      return reply(ctx, { embeds: [embeds.error("You don't have a custom role yet. Use `/boosterrole claim` first.")] });
    }

    const role = guild.roles.cache.get(memberData.customRoleId);

    // ── NAME ──
    if (sub === "name") {
      const newName = ctx.type === "prefix" ? ctx.args.slice(1).join(" ") : ctx.interaction.options.getString("name");
      if (!newName) return reply(ctx, { embeds: [embeds.error("Please provide a new name.")] });

      await role.setName(newName);
      return reply(ctx, { embeds: [embeds.success(`Your role name has been updated to **${newName}**.`)] });
    }

    // ── COLOR ──
    if (sub === "color") {
      const newColor = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("color");
      if (!newColor || !/^#([0-9a-f]{3}){1,2}$/i.test(newColor)) {
        return reply(ctx, { embeds: [embeds.error("Please provide a valid hex color (e.g., #FF0000).")] });
      }

      await role.setColor(newColor);
      return reply(ctx, { embeds: [embeds.success(`Your role color has been updated to **${newColor}**.`)] });
    }

    // ── ICON ──
    if (sub === "icon") {
      if (guild.premiumTier < 2) {
        return reply(ctx, { embeds: [embeds.error("Role icons require the server to be **Boost Level 2**.")] });
      }

      const icon = ctx.type === "prefix" ? ctx.message.attachments.first() : ctx.interaction.options.getAttachment("icon");
      if (!icon) return reply(ctx, { embeds: [embeds.error("Please provide an image attachment.")] });

      try {
        await role.setIcon(icon.url);
        return reply(ctx, { embeds: [embeds.success("Your role icon has been updated!")] });
      } catch (err) {
        return reply(ctx, { embeds: [embeds.error(`Failed to set icon: ${err.message}`)] });
      }
    }

    // ── DELETE ──
    if (sub === "delete") {
      await role.delete(`User requested deletion.`);
      memberData.customRoleId = null;
      await memberData.save();
      return reply(ctx, { embeds: [embeds.success("Your custom role has been deleted.")] });
    }
  },
};
