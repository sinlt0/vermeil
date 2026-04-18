// ============================================================
//  commands/moderation/warnconfig.js
//  Configure warn threshold punishments for this server
//  Subcommands: set, remove, list
//
//  Usage:
//    !warnconfig set <count> <action> [duration]
//    !warnconfig remove <count>
//    !warnconfig list
// ============================================================
const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
} = require("discord.js");
const { reply }   = require("../../utils/commandRunner");
const embeds      = require("../../utils/embeds");
const { parseDuration, formatDuration } = require("../../utils/modUtils");
const { fromConnection: WarnConfig }    = require("../../models/WarnConfig");

const VALID_ACTIONS = ["timeout", "kick", "tempban", "ban"];

module.exports = {
  name:             "warnconfig",
  description:      "Configure automatic punishments for warning thresholds.",
  category:         "moderation",
  aliases:          ["warncfg"],
  usage:            "<set|remove|list> [count] [action] [duration]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("warnconfig")
    .setDescription("Configure automatic punishments for warning thresholds.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName("set")
        .setDescription("Set an automatic action at a warning threshold.")
        .addIntegerOption((o) => o.setName("count").setDescription("Warning count to trigger action.").setRequired(true).setMinValue(1))
        .addStringOption((o) => o.setName("action").setDescription("Action to apply.").setRequired(true)
          .addChoices(
            { name: "Timeout",   value: "timeout"  },
            { name: "Kick",      value: "kick"      },
            { name: "Temp Ban",  value: "tempban"   },
            { name: "Perm Ban",  value: "ban"       },
          ))
        .addStringOption((o) => o.setName("duration").setDescription("Duration for timeout/tempban e.g. 1h, 7d.").setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName("remove")
        .setDescription("Remove the action at a warning threshold.")
        .addIntegerOption((o) => o.setName("count").setDescription("Warning count to remove.").setRequired(true).setMinValue(1))
    )
    .addSubcommand((sub) =>
      sub.setName("list")
        .setDescription("List all configured warning thresholds.")
    )
    .toJSON(),

  async execute(client, ctx) {
    const { guild } = ctx.type === "prefix" ? ctx.message : ctx.interaction;
    const mod       = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });
    }

    const WarnConfigModel = WarnConfig(guildDb.connection);

    // ── Resolve subcommand + args ──────────────────────
    let sub, count, action, durStr;

    if (ctx.type === "prefix") {
      sub    = ctx.args[0]?.toLowerCase();
      count  = parseInt(ctx.args[1]);
      action = ctx.args[2]?.toLowerCase();
      durStr = ctx.args[3];
    } else {
      sub    = ctx.interaction.options.getSubcommand();
      count  = ctx.interaction.options.getInteger("count");
      action = ctx.interaction.options.getString("action");
      durStr = ctx.interaction.options.getString("duration");
    }

    // ── LIST ───────────────────────────────────────────
    if (sub === "list") {
      const config = await WarnConfigModel.findOne({ guildId: guild.id });
      const thresholds = config?.thresholds ?? [];

      if (thresholds.length === 0) {
        return reply(ctx, {
          embeds: [embeds.info("No warning thresholds configured.\nUse `warnconfig set <count> <action>` to add one.")],
        });
      }

      const sorted = [...thresholds].sort((a, b) => a.count - b.count);
      const embed  = new EmbedBuilder()
        .setColor(0xFEE75C)
        .setTitle("⚙️ Warning Thresholds")
        .setDescription("Automatic actions applied when a member reaches a warning count.\n\u200b")
        .setFooter({ text: guild.name })
        .setTimestamp();

      for (const t of sorted) {
        const dur = t.duration ? ` — ${formatDuration(t.duration)}` : "";
        embed.addFields({
          name:  `${t.count} Warning${t.count === 1 ? "" : "s"}`,
          value: `**Action:** ${capitalise(t.action)}${dur}`,
          inline: true,
        });
      }

      return reply(ctx, { embeds: [embed] });
    }

    // ── SET ────────────────────────────────────────────
    if (sub === "set") {
      if (!count || count < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid warning count.")] });
      if (!action || !VALID_ACTIONS.includes(action)) {
        return reply(ctx, { embeds: [embeds.error(`Invalid action. Valid: \`${VALID_ACTIONS.join(", ")}\``)] });
      }

      const needsDuration = ["timeout", "tempban"].includes(action);
      const duration      = durStr ? parseDuration(durStr) : null;

      if (needsDuration && !duration) {
        return reply(ctx, { embeds: [embeds.error(`Action \`${action}\` requires a duration (e.g. \`1h\`, \`7d\`).`)] });
      }

      // Upsert the threshold
      await WarnConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        {
          $pull: { thresholds: { count } }, // remove existing for this count
        },
        { upsert: true }
      );

      await WarnConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        {
          $push: { thresholds: { count, action, duration: duration ?? null } },
        },
        { upsert: true }
      );

      const durLabel = duration ? ` for **${formatDuration(duration)}**` : "";
      return reply(ctx, {
        embeds: [embeds.success(
          `At **${count}** warning${count === 1 ? "" : "s"}: **${capitalise(action)}**${durLabel}`,
          "⚙️ Threshold Set"
        )],
      });
    }

    // ── REMOVE ─────────────────────────────────────────
    if (sub === "remove") {
      if (!count || count < 1) return reply(ctx, { embeds: [embeds.error("Please provide a valid warning count.")] });

      const result = await WarnConfigModel.findOneAndUpdate(
        { guildId: guild.id },
        { $pull: { thresholds: { count } } },
        { new: true }
      );

      if (!result) {
        return reply(ctx, { embeds: [embeds.error(`No threshold found for **${count}** warnings.`)] });
      }

      return reply(ctx, {
        embeds: [embeds.success(`Threshold for **${count}** warning${count === 1 ? "" : "s"} has been removed.`, "⚙️ Threshold Removed")],
      });
    }

    // ── Invalid subcommand ─────────────────────────────
    return reply(ctx, {
      embeds: [embeds.error(`Invalid subcommand. Use: \`set\`, \`remove\`, or \`list\`.`)],
    });
  },
};

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
