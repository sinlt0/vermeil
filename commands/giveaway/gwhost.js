// ============================================================
//  commands/giveaway/gwhost.js
//  Manage giveaway hosts (roles and users)
//  Subcommands: add, remove, list
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js");
const { reply }          = require("../../utils/commandRunner");
const embeds             = require("../../utils/embeds");
const { fromConnection } = require("../../models/GiveawayConfig");

module.exports = {
  name:             "gwhost",
  description:      "Manage giveaway hosts.",
  category:         "giveaway",
  aliases:          [],
  usage:            "<add|remove|list> <role|user> [@target]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("gwhost")
    .setDescription("Manage giveaway hosts.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName("add")
      .setDescription("Add a giveaway host.")
      .addStringOption(o => o.setName("type").setDescription("Role or user.").setRequired(true)
        .addChoices({ name: "Role", value: "role" }, { name: "User", value: "user" }))
      .addMentionableOption(o => o.setName("target").setDescription("The role or user to add.").setRequired(true))
    )
    .addSubcommand(s => s.setName("remove")
      .setDescription("Remove a giveaway host.")
      .addStringOption(o => o.setName("type").setDescription("Role or user.").setRequired(true)
        .addChoices({ name: "Role", value: "role" }, { name: "User", value: "user" }))
      .addMentionableOption(o => o.setName("target").setDescription("The role or user to remove.").setRequired(true))
    )
    .addSubcommand(s => s.setName("list").setDescription("List all giveaway hosts."))
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const GiveawayConfigModel = fromConnection(guildDb.connection);

    let sub, type, targetId;
    if (ctx.type === "prefix") {
      sub      = ctx.args[0]?.toLowerCase();
      type     = ctx.args[1]?.toLowerCase();
      const mention = ctx.message.mentions.roles.first() ?? ctx.message.mentions.users.first();
      targetId = mention?.id ?? ctx.args[2];
    } else {
      sub      = ctx.interaction.options.getSubcommand();
      type     = ctx.interaction.options.getString("type");
      targetId = ctx.interaction.options.getMentionable("target")?.id;
    }

    // LIST
    if (sub === "list") {
      const config = await GiveawayConfigModel.findOne({ guildId: guild.id });
      const roles  = config?.hostRoles ?? [];
      const users  = config?.hostUsers ?? [];

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle("🎉 Giveaway Hosts")
        .addFields(
          { name: "🎭 Host Roles", value: roles.length > 0 ? roles.map(r => `<@&${r}>`).join("\n") : "*(none)*", inline: true },
          { name: "👤 Host Users", value: users.length > 0 ? users.map(u => `<@${u}>`).join("\n") : "*(none)*", inline: true },
        )
        .setFooter({ text: "Admins with Manage Server can always host giveaways." })
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    }

    if (!["role", "user"].includes(type)) {
      return reply(ctx, { embeds: [embeds.error("Type must be `role` or `user`.")] });
    }
    if (!targetId) return reply(ctx, { embeds: [embeds.error("Please provide a valid target.")] });

    const field = type === "role" ? "hostRoles" : "hostUsers";
    const mention = type === "role" ? `<@&${targetId}>` : `<@${targetId}>`;

    // ADD
    if (sub === "add") {
      await GiveawayConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $addToSet: { [field]: targetId }, $setOnInsert: { guildId: guild.id } },
        { upsert: true }
      );
      return reply(ctx, { embeds: [embeds.success(`${mention} can now host giveaways.`, "✅ Host Added")] });
    }

    // REMOVE
    if (sub === "remove") {
      await GiveawayConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { [field]: targetId } }
      );
      return reply(ctx, { embeds: [embeds.success(`${mention} can no longer host giveaways.`, "✅ Host Removed")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `add`, `remove`, `list`.")] });
  },
};
