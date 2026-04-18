// ============================================================
//  commands/moderation/kick.js
// ============================================================
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { reply }        = require("../../utils/commandRunner");
const embeds           = require("../../utils/embeds");
const { createCase, sendModLog } = require("../../utils/modUtils");

module.exports = {
  name:             "kick",
  description:      "Kick a member from the server.",
  category:         "moderation",
  aliases:          [],
  usage:            "<@user> [reason]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName("user").setDescription("The member to kick.").setRequired(true))
    .addStringOption((o) => o.setName("reason").setDescription("Reason for the kick.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    // ── Permission check ───────────────────────────────
    if (!mod.permissions.has(PermissionFlagsBits.KickMembers)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Kick Members** permission.")] });
    }

    // ── Resolve target ─────────────────────────────────
    let target, reason;
    if (ctx.type === "prefix") {
      const mention = ctx.message.mentions.members.first();
      if (!mention) return reply(ctx, { embeds: [embeds.error("Please mention a member to kick.")] });
      target = mention;
      reason = ctx.args.slice(1).join(" ") || "No reason provided.";
    } else {
      target = ctx.interaction.options.getMember("user");
      reason = ctx.interaction.options.getString("reason") || "No reason provided.";
    }

    if (!target) return reply(ctx, { embeds: [embeds.error("Member not found.")] });
    if (target.id === mod.id) return reply(ctx, { embeds: [embeds.error("You cannot kick yourself.")] });
    if (!target.kickable) return reply(ctx, { embeds: [embeds.error("I cannot kick this member. They may have a higher role than me.")] });
    if (target.roles.highest.position >= mod.roles.highest.position) {
      return reply(ctx, { embeds: [embeds.error("You cannot kick someone with an equal or higher role.")] });
    }

    // ── DM target before kick ──────────────────────────
    await target.user.send({
      embeds: [embeds.warning(`You have been **kicked** from **${guild.name}**.\n**Reason:** ${reason}`, "👢 You were kicked")],
    }).catch(() => {});

    await target.kick(reason);

    const modCase = await createCase(client, guild.id, {
      action:       "kick",
      targetId:     target.id,
      targetTag:    target.user.tag,
      moderatorId:  mod.id,
      moderatorTag: mod.user.tag,
      reason,
    });

    await sendModLog(client, guild, modCase);

    return reply(ctx, {
      embeds: [embeds.success(`**${target.user.tag}** has been kicked.\n**Reason:** ${reason}\n**Case:** #${modCase?.caseNumber ?? "N/A"}`, "👢 Member Kicked")],
    });
  },
};
