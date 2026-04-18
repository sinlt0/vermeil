// ============================================================
//  commands/giveaway/giveaway.js
//  Main giveaway command
//  Subcommands: start, end, reroll, pause, resume, list
// ============================================================
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const { reply }                       = require("../../utils/commandRunner");
const embeds                          = require("../../utils/embeds");
const { fromConnection: Giveaway }    = require("../../models/Giveaway");
const {
  canHost, buildEmbed, buildRow,
  endGiveaway, drawWinners,
  parseDuration, formatDuration,
} = require("../../utils/giveawayUtils");

module.exports = {
  name:             "giveaway",
  description:      "Manage giveaways.",
  category:         "giveaway",
  aliases:          ["gw"],
  usage:            "<start|end|reroll|pause|resume|list>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage giveaways.")
    .addSubcommand(s => s.setName("start")
      .setDescription("Start a new giveaway.")
      .addStringOption(o => o.setName("prize").setDescription("The prize.").setRequired(true).setMaxLength(256))
      .addStringOption(o => o.setName("duration").setDescription("Duration e.g. 1h, 1d, 7d.").setRequired(true))
      .addIntegerOption(o => o.setName("winners").setDescription("Number of winners.").setRequired(false).setMinValue(1).setMaxValue(20))
      .addStringOption(o => o.setName("required_roles").setDescription("Required role IDs (comma separated).").setRequired(false))
      .addStringOption(o => o.setName("blacklist_roles").setDescription("Blacklisted role IDs (comma separated).").setRequired(false))
      .addStringOption(o => o.setName("blacklist_users").setDescription("Blacklisted user IDs (comma separated).").setRequired(false))
      .addStringOption(o => o.setName("bonus_entries").setDescription("Bonus entries format: roleId:entries,roleId:entries").setRequired(false))
      .addBooleanOption(o => o.setName("dm_winners").setDescription("DM winners when giveaway ends.").setRequired(false))
    )
    .addSubcommand(s => s.setName("end")
      .setDescription("End a giveaway early.")
      .addStringOption(o => o.setName("messageid").setDescription("Message ID of the giveaway.").setRequired(true))
    )
    .addSubcommand(s => s.setName("reroll")
      .setDescription("Reroll winners for an ended giveaway.")
      .addStringOption(o => o.setName("messageid").setDescription("Message ID of the giveaway.").setRequired(true))
      .addIntegerOption(o => o.setName("count").setDescription("Number of winners to reroll.").setRequired(false).setMinValue(1))
    )
    .addSubcommand(s => s.setName("pause")
      .setDescription("Pause a giveaway.")
      .addStringOption(o => o.setName("messageid").setDescription("Message ID of the giveaway.").setRequired(true))
    )
    .addSubcommand(s => s.setName("resume")
      .setDescription("Resume a paused giveaway.")
      .addStringOption(o => o.setName("messageid").setDescription("Message ID of the giveaway.").setRequired(true))
    )
    .addSubcommand(s => s.setName("list")
      .setDescription("List all active giveaways.")
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const member = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    // Check host permissions
    const isHost = await canHost(client, guild, member, guildDb);
    if (!isHost) {
      return reply(ctx, { embeds: [embeds.error("You don't have permission to manage giveaways.\nYou need **Manage Server** or a giveaway host role.")] });
    }

    const GiveawayModel = Giveaway(guildDb.connection);
    const sub = ctx.type === "prefix" ? ctx.args[0]?.toLowerCase() : ctx.interaction.options.getSubcommand();

    // ── START ──────────────────────────────────────────
    if (sub === "start") {
      let prize, durStr, winnerCount, reqRoles, blRoles, blUsers, bonusStr, dmWinners;

      if (ctx.type === "prefix") {
        prize       = ctx.args.slice(1).join(" ");
        durStr      = ctx.args[1];
        winnerCount = 1;
        reqRoles    = [];
        blRoles     = [];
        blUsers     = [];
        bonusStr    = null;
        dmWinners   = true;
        return reply(ctx, { embeds: [embeds.error("Please use the slash command for starting giveaways: `/giveaway start`")] });
      } else {
        prize       = ctx.interaction.options.getString("prize");
        durStr      = ctx.interaction.options.getString("duration");
        winnerCount = ctx.interaction.options.getInteger("winners") ?? 1;
        dmWinners   = ctx.interaction.options.getBoolean("dm_winners") ?? true;

        // Parse required roles
        const reqStr = ctx.interaction.options.getString("required_roles");
        reqRoles     = reqStr ? reqStr.split(",").map(s => s.trim()).filter(Boolean) : [];

        // Parse blacklist roles
        const blRoleStr = ctx.interaction.options.getString("blacklist_roles");
        blRoles = blRoleStr ? blRoleStr.split(",").map(s => s.trim()).filter(Boolean) : [];

        // Parse blacklist users
        const blUserStr = ctx.interaction.options.getString("blacklist_users");
        blUsers = blUserStr ? blUserStr.split(",").map(s => s.trim()).filter(Boolean) : [];

        // Parse bonus entries
        bonusStr = ctx.interaction.options.getString("bonus_entries");
      }

      const duration = parseDuration(durStr);
      if (!duration) return reply(ctx, { embeds: [embeds.error("Invalid duration. Example: `1h`, `1d`, `7d`.")] });

      const endsAt = new Date(Date.now() + duration);

      // Parse bonus entries
      const bonusEntries = [];
      if (bonusStr) {
        for (const part of bonusStr.split(",")) {
          const [roleId, count] = part.trim().split(":");
          if (roleId && count && !isNaN(parseInt(count))) {
            bonusEntries.push({ roleId: roleId.trim(), entries: parseInt(count) });
          }
        }
      }

      // Send giveaway message
      const channel = ctx.interaction.channel;
      const placeholder = await channel.send({ content: "🎉 Setting up giveaway..." });

      const giveaway = await GiveawayModel.create({
        guildId:        guild.id,
        channelId:      channel.id,
        messageId:      placeholder.id,
        hostId:         member.id,
        prize,
        winnerCount,
        endsAt,
        requiredRoles:  reqRoles,
        blacklistRoles: blRoles,
        blacklistUsers: blUsers,
        bonusEntries,
        dmWinners,
      });

      await placeholder.edit({
        content:    null,
        embeds:     [buildEmbed(giveaway)],
        components: [buildRow(giveaway)],
      });

      return reply(ctx, { embeds: [embeds.success(`Giveaway started! [Jump to giveaway](${placeholder.url})`, "🎉 Giveaway Started")], ephemeral: true });
    }

    // ── Resolve giveaway by message ID ─────────────────
    const getGiveaway = async (messageId) => {
      if (!messageId) return null;
      return GiveawayModel.findOne({ guildId: guild.id, messageId });
    };

    // ── END ────────────────────────────────────────────
    if (sub === "end") {
      const messageId = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("messageid");
      const giveaway  = await getGiveaway(messageId);
      if (!giveaway) return reply(ctx, { embeds: [embeds.error("Giveaway not found.")] });
      if (giveaway.status === "ended") return reply(ctx, { embeds: [embeds.error("This giveaway has already ended.")] });

      const channel = guild.channels.cache.get(giveaway.channelId);
      if (!channel) return reply(ctx, { embeds: [embeds.error("Giveaway channel not found.")] });

      await endGiveaway(client, giveaway, guildDb, channel);
      return reply(ctx, { embeds: [embeds.success("Giveaway ended!", "🎉 Giveaway Ended")] });
    }

    // ── REROLL ─────────────────────────────────────────
    if (sub === "reroll") {
      const messageId = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("messageid");
      const count     = ctx.type === "prefix" ? parseInt(ctx.args[2]) || 1 : ctx.interaction.options.getInteger("count") ?? 1;
      const giveaway  = await getGiveaway(messageId);
      if (!giveaway) return reply(ctx, { embeds: [embeds.error("Giveaway not found.")] });
      if (giveaway.status !== "ended") return reply(ctx, { embeds: [embeds.error("This giveaway hasn't ended yet.")] });
      if (giveaway.entries.length === 0) return reply(ctx, { embeds: [embeds.error("No entries to reroll from.")] });

      const newWinners = drawWinners(giveaway.entries, count);
      await GiveawayModel.findOneAndUpdate({ messageId }, { $set: { winners: newWinners } });

      const channel = guild.channels.cache.get(giveaway.channelId);
      const mentions = newWinners.map(w => `<@${w}>`).join(", ");

      await channel?.send({ content: `🎲 **Reroll!** New winner${newWinners.length > 1 ? "s" : ""}: ${mentions}! Congratulations for winning **${giveaway.prize}**!` });

      // DM new winners
      if (giveaway.dmWinners) {
        for (const winnerId of newWinners) {
          const user = await client.users.fetch(winnerId).catch(() => null);
          if (!user) continue;
          const dmEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle("🎉 You Won a Giveaway Reroll!")
            .setDescription(`You won **${giveaway.prize}** in **${guild.name}**!`)
            .setTimestamp();
          await user.send({ embeds: [dmEmbed] }).catch(() => {});
        }
      }

      return reply(ctx, { embeds: [embeds.success(`Rerolled! New winner${newWinners.length > 1 ? "s" : ""}: ${mentions}`, "🎲 Rerolled")] });
    }

    // ── PAUSE ──────────────────────────────────────────
    if (sub === "pause") {
      const messageId = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("messageid");
      const giveaway  = await getGiveaway(messageId);
      if (!giveaway) return reply(ctx, { embeds: [embeds.error("Giveaway not found.")] });
      if (giveaway.status !== "active") return reply(ctx, { embeds: [embeds.error("This giveaway is not active.")] });

      await GiveawayModel.findOneAndUpdate({ messageId }, { $set: { status: "paused" } });
      giveaway.status = "paused";

      const channel = guild.channels.cache.get(giveaway.channelId);
      const msg     = await channel?.messages.fetch(messageId).catch(() => null);
      await msg?.edit({ embeds: [buildEmbed(giveaway)], components: [buildRow(giveaway)] });

      return reply(ctx, { embeds: [embeds.success("Giveaway paused. No new entries will be accepted.", "⏸️ Paused")] });
    }

    // ── RESUME ─────────────────────────────────────────
    if (sub === "resume") {
      const messageId = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("messageid");
      const giveaway  = await getGiveaway(messageId);
      if (!giveaway) return reply(ctx, { embeds: [embeds.error("Giveaway not found.")] });
      if (giveaway.status !== "paused") return reply(ctx, { embeds: [embeds.error("This giveaway is not paused.")] });

      await GiveawayModel.findOneAndUpdate({ messageId }, { $set: { status: "active" } });
      giveaway.status = "active";

      const channel = guild.channels.cache.get(giveaway.channelId);
      const msg     = await channel?.messages.fetch(messageId).catch(() => null);
      await msg?.edit({ embeds: [buildEmbed(giveaway)], components: [buildRow(giveaway)] });

      return reply(ctx, { embeds: [embeds.success("Giveaway resumed! Entries are now open again.", "▶️ Resumed")] });
    }

    // ── LIST ───────────────────────────────────────────
    if (sub === "list") {
      const active = await GiveawayModel.find({ guildId: guild.id, status: { $in: ["active", "paused"] } });

      if (active.length === 0) {
        return reply(ctx, { embeds: [embeds.info("No active giveaways in this server.")] });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle("🎉 Active Giveaways")
        .setDescription(active.map(g =>
          `**${g.prize}**\n` +
          `┣ Winners: \`${g.winnerCount}\` • Entries: \`${new Set(g.entries).size}\`\n` +
          `┣ Status: ${g.status === "paused" ? "⏸️ Paused" : "✅ Active"}\n` +
          `┗ Ends: <t:${Math.floor(g.endsAt.getTime() / 1000)}:R>`
        ).join("\n\n"))
        .setFooter({ text: `${active.length} giveaway(s)` })
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand.")] });
  },
};
