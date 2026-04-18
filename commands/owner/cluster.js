// ============================================================
//  commands/owner/cluster.js
//  Owner/dev only — manages cluster migrations
//
//  Subcommands:
//    cluster migrate <clusterNumber> [targetCluster]
//      Emergency: reassigns all servers from a dead cluster to
//      other available clusters. NO data transfer. Notifies
//      server owners via DM and posts in a random text channel.
//
//    cluster move <clusterNumber> [targetCluster]
//      Graceful: reassigns all servers and TRANSFERS all data.
//      Used when intentionally retiring a cluster.
//
//  Both subcommands require a confirmation embed with buttons
//  before executing. Times out after 30 seconds.
// ============================================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");

module.exports = {
  name:             "cluster",
  description:      "Manage database cluster migrations. (Owner/Dev only)",
  category:         "dev",
  aliases:          [],
  usage:            "<migrate|move> <clusterName> [targetCluster]",
  cooldown:         0,
  ownerOnly:        false,
  devOnly:          true,
  requiresDatabase: false,
  slash:            false, // prefix only

  async execute(client, ctx) {
    const { args } = ctx;

    // ── Arg validation ─────────────────────────────────
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || !["migrate", "move"].includes(subcommand)) {
      return reply(ctx, {
        embeds: [
          embeds.error(
            `Invalid subcommand. Usage:\n` +
            `\`${client.config.prefix}cluster migrate <clusterName> [targetCluster]\`\n` +
            `\`${client.config.prefix}cluster move <clusterName> [targetCluster]\``
          ),
        ],
      });
    }

    const sourceCluster = args[1];
    const targetCluster = args[2] || null;

    if (!sourceCluster) {
      return reply(ctx, {
        embeds: [embeds.error("Please provide a source cluster name.")],
      });
    }

    // Verify source cluster exists
    const { clusterMap } = client.db;
    if (!clusterMap.has(sourceCluster)) {
      return reply(ctx, {
        embeds: [embeds.error(`Cluster \`${sourceCluster}\` does not exist.`)],
      });
    }

    // Verify target cluster exists (if specified)
    if (targetCluster && !clusterMap.has(targetCluster)) {
      return reply(ctx, {
        embeds: [embeds.error(`Target cluster \`${targetCluster}\` does not exist.`)],
      });
    }

    // Verify target is available (if specified)
    if (targetCluster && !client.db.isClusterAvailable(targetCluster)) {
      return reply(ctx, {
        embeds: [embeds.error(`Target cluster \`${targetCluster}\` is not available (down or at capacity).`)],
      });
    }

    // Count servers in source cluster
    const assignments = await client.db.getAllAssignments(sourceCluster);
    const serverCount = assignments.length;

    // ── Build confirmation embed ────────────────────────
    const isMigrate  = subcommand === "migrate";
    const actionName = isMigrate ? "Emergency Migrate" : "Graceful Move";
    const actionDesc = isMigrate
      ? "⚠️ **This is an emergency migration. NO data will be transferred.** Server owners will be notified and asked to reconfigure their settings."
      : "✅ **This is a graceful move. All server data will be transferred** to the new cluster automatically.";

    const confirmEmbed = new EmbedBuilder()
      .setColor(isMigrate ? 0xED4245 : 0xFEE75C)
      .setTitle(`⚠️ Confirm Cluster ${actionName}`)
      .setDescription(
        `You are about to **${actionName.toLowerCase()}** cluster \`${sourceCluster}\`.\n\n` +
        `${actionDesc}\n\n` +
        `**Source Cluster:** \`${sourceCluster}\`\n` +
        `**Target Cluster:** ${targetCluster ? `\`${targetCluster}\`` : "Random available clusters"}\n` +
        `**Servers Affected:** \`${serverCount}\`\n\n` +
        `This action **cannot be undone**. Confirm below.`
      )
      .setFooter({ text: "This confirmation will expire in 30 seconds." })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("cluster_confirm")
        .setLabel(`Confirm ${actionName}`)
        .setStyle(isMigrate ? ButtonStyle.Danger : ButtonStyle.Primary)
        .setEmoji(isMigrate ? "⚠️" : "✅"),
      new ButtonBuilder()
        .setCustomId("cluster_cancel")
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌")
    );

    const confirmMsg = await reply(ctx, {
      embeds: [confirmEmbed],
      components: [row],
    });

    // ── Wait for button interaction ─────────────────────
    const filter = (i) => {
      const userId = ctx.type === "prefix"
        ? ctx.message.author.id
        : ctx.interaction.user.id;
      return i.user.id === userId &&
        ["cluster_confirm", "cluster_cancel"].includes(i.customId);
    };

    let interaction;
    try {
      interaction = await confirmMsg.awaitMessageComponent({ filter, time: 30_000 });
    } catch {
      // Timed out
      const timeoutEmbed = new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle("⏱️ Confirmation Timed Out")
        .setDescription("The cluster operation was cancelled due to inactivity.");

      return confirmMsg.edit({ embeds: [timeoutEmbed], components: [] });
    }

    await interaction.deferUpdate();

    // Cancelled
    if (interaction.customId === "cluster_cancel") {
      const cancelEmbed = new EmbedBuilder()
        .setColor(0x99AAB5)
        .setTitle("❌ Operation Cancelled")
        .setDescription(`Cluster ${actionName.toLowerCase()} was cancelled.`);

      return confirmMsg.edit({ embeds: [cancelEmbed], components: [] });
    }

    // ── Execute the operation ───────────────────────────
    if (isMigrate) {
      await executeMigrate(client, ctx, confirmMsg, sourceCluster, targetCluster, assignments);
    } else {
      await executeMove(client, ctx, confirmMsg, sourceCluster, targetCluster, assignments);
    }
  },
};

// ============================================================
//  MIGRATE — Emergency, no data transfer
// ============================================================
async function executeMigrate(client, ctx, confirmMsg, sourceCluster, targetCluster, assignments) {
  let done = 0;
  let failed = 0;
  const total = assignments.length;

  // Show live progress embed
  const progressEmbed = () =>
    new EmbedBuilder()
      .setColor(0xFF6B35)
      .setTitle("🔄 Emergency Migration In Progress...")
      .setDescription(
        `**Source:** \`${sourceCluster}\`\n` +
        `**Progress:** \`${done + failed}/${total}\` servers processed\n` +
        `✅ Reassigned: \`${done}\`  |  ❌ Failed: \`${failed}\``
      )
      .setFooter({ text: "Please wait..." })
      .setTimestamp();

  await confirmMsg.edit({ embeds: [progressEmbed()], components: [] });

  for (const assignment of assignments) {
    const { guildId } = assignment;

    try {
      // Assign to new cluster (random or specified)
      const newCluster = await client.db.assignGuild(guildId, targetCluster);

      // Remove old assignment data (best effort — cluster may be dead)
      await client.db.deleteGuildData(guildId, sourceCluster).catch(() => {});

      // Notify server
      await notifyGuild(client, guildId, sourceCluster, newCluster, false);

      done++;
    } catch {
      failed++;
    }

    // Update progress every 5 servers
    if ((done + failed) % 5 === 0) {
      await confirmMsg.edit({ embeds: [progressEmbed()] }).catch(() => {});
    }
  }

  // Final summary
  const doneEmbed = new EmbedBuilder()
    .setColor(done > 0 ? 0x57F287 : 0xED4245)
    .setTitle("✅ Emergency Migration Complete")
    .setDescription(
      `Cluster \`${sourceCluster}\` has been emergency migrated.\n\n` +
      `**Total Servers:** \`${total}\`\n` +
      `**Reassigned:** \`${done}\`\n` +
      `**Failed:** \`${failed}\`\n\n` +
      `Server owners have been notified via DM and in their servers.`
    )
    .setTimestamp();

  await confirmMsg.edit({ embeds: [doneEmbed] });
}

// ============================================================
//  MOVE — Graceful, with full data transfer
// ============================================================
async function executeMove(client, ctx, confirmMsg, sourceCluster, targetCluster, assignments) {
  let done = 0;
  let failed = 0;
  const total = assignments.length;

  const progressEmbed = () =>
    new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🔄 Cluster Move In Progress...")
      .setDescription(
        `**Source:** \`${sourceCluster}\`\n` +
        `**Progress:** \`${done + failed}/${total}\` servers processed\n` +
        `✅ Moved: \`${done}\`  |  ❌ Failed: \`${failed}\``
      )
      .setFooter({ text: "Transferring data — please wait..." })
      .setTimestamp();

  await confirmMsg.edit({ embeds: [progressEmbed()], components: [] });

  for (const assignment of assignments) {
    const { guildId } = assignment;

    try {
      // Determine target cluster for this guild
      const resolvedTarget = targetCluster || (() => {
        const available = [...client.db.clusterMap.keys()]
          .filter((n) => n !== sourceCluster && client.db.isClusterAvailable(n));
        if (!available.length) throw new Error("No available clusters.");
        return available[Math.floor(Math.random() * available.length)];
      })();

      // Transfer all data to the new cluster
      await client.db.transferGuildData(guildId, sourceCluster, resolvedTarget);

      // Notify server (graceful — no reconfiguration needed)
      await notifyGuild(client, guildId, sourceCluster, resolvedTarget, true);

      done++;
    } catch {
      failed++;
    }

    if ((done + failed) % 5 === 0) {
      await confirmMsg.edit({ embeds: [progressEmbed()] }).catch(() => {});
    }
  }

  const doneEmbed = new EmbedBuilder()
    .setColor(done > 0 ? 0x57F287 : 0xED4245)
    .setTitle("✅ Cluster Move Complete")
    .setDescription(
      `Cluster \`${sourceCluster}\` has been gracefully moved.\n\n` +
      `**Total Servers:** \`${total}\`\n` +
      `**Moved:** \`${done}\`\n` +
      `**Failed:** \`${failed}\`\n\n` +
      `All data has been transferred to the new clusters.`
    )
    .setTimestamp();

  await confirmMsg.edit({ embeds: [doneEmbed] });
}

// ============================================================
//  Notify a guild — DM owner + post in random text channel
// ============================================================
async function notifyGuild(client, guildId, oldCluster, newCluster, graceful) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const embed = graceful
    ? buildGracefulEmbed(oldCluster, newCluster)
    : buildEmergencyEmbed(oldCluster, newCluster);

  // DM the server owner
  try {
    const owner = await guild.fetchOwner();
    await owner.user.send({ embeds: [embed] });
  } catch {}

  // Post in a random accessible text channel
  try {
    const textChannels = guild.channels.cache.filter(
      (c) => c.isTextBased() && c.permissionsFor(guild.members.me).has("SendMessages")
    );
    if (textChannels.size === 0) return;

    const arr     = [...textChannels.values()];
    const channel = arr[Math.floor(Math.random() * arr.length)];
    await channel.send({ embeds: [embed] });
  } catch {}
}

function buildEmergencyEmbed(oldCluster, newCluster) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle("⚠️ Server Cluster Changed")
    .setDescription(
      `Due to some internal errors, we were **unable to recover cluster \`${oldCluster}\`**.\n\n` +
      `Your server has been moved to cluster **\`${newCluster}\`**.\n\n` +
      `Please kindly **reconfigure your server settings** as your previous data could not be recovered.`
    )
    .setTimestamp();
}

function buildGracefulEmbed(oldCluster, newCluster) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🔄 Server Cluster Migrated")
    .setDescription(
      `Your server has been **successfully migrated** from cluster \`${oldCluster}\` to cluster \`${newCluster}\`.\n\n` +
      `All your server data has been transferred automatically. **No action is required.**`
    )
    .setTimestamp();
}
