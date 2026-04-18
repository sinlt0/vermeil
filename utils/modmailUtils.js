// ============================================================
//  utils/modmailUtils.js
//  Core modmail system logic
// ============================================================
const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, AttachmentBuilder, PermissionFlagsBits,
  ChannelType,
} = require("discord.js");

const { fromConnection: ModmailConfig }  = require("../models/ModmailConfig");
const { fromConnection: ModmailThread }  = require("../models/ModmailThread");

// ── Design constants ──────────────────────────────────────
const COLORS = {
  user:    0x5865F2, // blurple  — user message
  staff:   0x57F287, // green    — staff reply
  anon:    0xED4245, // red      — anonymous reply
  note:    0xFEE75C, // yellow   — internal note
  system:  0xFF9800, // orange   — system message
  open:    0x57F287,
  closed:  0x99AAB5,
  pending: 0xFEE75C,
  onhold:  0xFF9800,
};

const PRIORITY_COLORS = {
  low:    0x57F287,
  medium: 0x5865F2,
  high:   0xFEE75C,
  urgent: 0xED4245,
};

const PRIORITY_EMOJIS = {
  low:    "🟢",
  medium: "🔵",
  high:   "🟡",
  urgent: "🔴",
};

const STATUS_EMOJIS = {
  open:     "📬",
  pending:  "⏳",
  "on-hold":"⏸️",
  closed:   "🔒",
};

// ============================================================
//  Open a new modmail thread
// ============================================================
async function openThread(client, guild, user, guildDb, initialMessage = null) {
  const ModmailConfigModel = ModmailConfig(guildDb.connection);
  const ModmailThreadModel = ModmailThread(guildDb.connection);

  const config = await ModmailConfigModel.findOne({ guildId: guild.id });
  if (!config?.enabled) return { error: "Modmail is not enabled in this server." };
  if (!config.categoryId) return { error: "Modmail category not configured." };

  // Check blacklist
  if (config.blacklist.includes(user.id)) {
    return { error: "You have been blacklisted from using modmail in this server." };
  }

  // Check existing open thread
  const existing = await ModmailThreadModel.findOne({ guildId: guild.id, userId: user.id, status: { $in: ["open", "pending", "on-hold"] } });
  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channelId);
    return { error: `You already have an open thread${existingChannel ? ` in ${existingChannel}` : ""}.` };
  }

  // Check account age
  if (config.minAccountAge > 0) {
    const accountAgeDays = Math.floor((Date.now() - user.createdTimestamp) / 86400000);
    if (accountAgeDays < config.minAccountAge) {
      return { error: `Your account must be at least **${config.minAccountAge} days old** to use modmail.` };
    }
  }

  // Check server age
  if (config.minServerAge > 0) {
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member) {
      const serverAgeDays = Math.floor((Date.now() - member.joinedTimestamp) / 86400000);
      if (serverAgeDays < config.minServerAge) {
        return { error: `You must have been in the server for at least **${config.minServerAge} days** to use modmail.` };
      }
    }
  }

  // Get thread count for numbering
  const threadCount = await ModmailThreadModel.countDocuments({ guildId: guild.id }) + 1;

  // Get previous thread count for this user
  const prevThreads = await ModmailThreadModel.countDocuments({ guildId: guild.id, userId: user.id, status: "closed" });

  // Fetch full member
  const member = await guild.members.fetch(user.id).catch(() => null);

  // Create thread channel
  const channel = await guild.channels.create({
    name:   `${user.username}-${String(threadCount).padStart(4, "0")}`,
    type:   ChannelType.GuildText,
    parent: config.categoryId,
    topic:  `Modmail | ${user.tag} (${user.id}) | Thread #${threadCount}`,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...(config.alertRoleId ? [{ id: config.alertRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }] : []),
    ],
  });

  // Save thread
  const thread = await ModmailThreadModel.create({
    guildId:      guild.id,
    channelId:    channel.id,
    userId:       user.id,
    userTag:      user.tag,
    threadNumber: threadCount,
  });

  // ── Header embed ──────────────────────────────────────
  const accountAge  = Math.floor((Date.now() - user.createdTimestamp) / 86400000);
  const joinedAge   = member ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000) : null;
  const topRoles    = member?.roles.cache
    .filter(r => r.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .first(3)
    .map(r => `<@&${r.id}>`)
    .join(" ") || "None";

  const headerEmbed = new EmbedBuilder()
    .setColor(COLORS.system)
    .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setTitle(`📬 New Modmail Thread — #${String(threadCount).padStart(4, "0")}`)
    .addFields(
      { name: "👤 User",          value: `${user.tag}\n<@${user.id}>`,                                inline: true  },
      { name: "🆔 User ID",       value: `\`${user.id}\``,                                            inline: true  },
      { name: "📅 Account Age",   value: `\`${accountAge}\` days`,                                    inline: true  },
      { name: "📆 Server Age",    value: joinedAge !== null ? `\`${joinedAge}\` days` : "Not in server", inline: true },
      { name: "📨 Past Threads",  value: `\`${prevThreads}\``,                                        inline: true  },
      { name: "🎭 Top Roles",     value: topRoles,                                                    inline: false },
    )
    .setFooter({ text: `Thread #${String(threadCount).padStart(4, "0")} • ${guild.name}` })
    .setTimestamp();

  // Action buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`mm_close_${channel.id}`).setLabel("Close").setStyle(ButtonStyle.Danger).setEmoji("🔒"),
    new ButtonBuilder().setCustomId(`mm_claim_${channel.id}`).setLabel("Claim").setStyle(ButtonStyle.Primary).setEmoji("✋"),
    new ButtonBuilder().setCustomId(`mm_pending_${channel.id}`).setLabel("Pending").setStyle(ButtonStyle.Secondary).setEmoji("⏳"),
    new ButtonBuilder().setCustomId(`mm_onhold_${channel.id}`).setLabel("On Hold").setStyle(ButtonStyle.Secondary).setEmoji("⏸️"),
  );

  const alertContent = config.alertRoleId ? `<@&${config.alertRoleId}>` : "";
  await channel.send({ content: alertContent || undefined, embeds: [headerEmbed], components: [row] });

  // Send initial message if any
  if (initialMessage) {
    await relayToThread(client, guild, channel, user, initialMessage, null, guildDb);
  }

  // DM greet message
  const greetEmbed = new EmbedBuilder()
    .setColor(COLORS.system)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
    .setTitle("📬 Modmail Thread Opened")
    .setDescription(config.greetMessage)
    .addFields({ name: "Thread", value: `#${String(threadCount).padStart(4, "0")}`, inline: true })
    .setFooter({ text: "Reply to this DM to continue the conversation." })
    .setTimestamp();

  await user.send({ embeds: [greetEmbed] }).catch(() => {});

  // Log
  await sendModmailLog(client, guild, guildDb, "opened", thread, user);

  return { thread, channel };
}

// ============================================================
//  Relay user message to thread channel
// ============================================================
async function relayToThread(client, guild, channel, user, message, attachments, guildDb) {
  const ModmailThreadModel = ModmailThread(guildDb.connection);

  const embed = new EmbedBuilder()
    .setColor(COLORS.user)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
    .setDescription(message || "*No text content*")
    .setFooter({ text: `User • ${user.id}` })
    .setTimestamp();

  const files = [];
  if (attachments?.length > 0) {
    embed.addFields({ name: "📎 Attachments", value: attachments.map((a, i) => `[Attachment ${i + 1}](${a})`).join("\n") });
  }

  await channel.send({ embeds: [embed], files });

  await ModmailThreadModel.findOneAndUpdate(
    { channelId: channel.id },
    { $inc: { messageCount: 1 } }
  );
}

// ============================================================
//  Relay staff reply to user DM
// ============================================================
async function relayToUser(client, user, guild, message, staffMember, anonymous, attachments = []) {
  const displayName = anonymous ? "Support Team" : staffMember.user.tag;
  const displayAvatar = anonymous
    ? guild.iconURL({ dynamic: true }) ?? undefined
    : staffMember.user.displayAvatarURL({ dynamic: true });

  const embed = new EmbedBuilder()
    .setColor(anonymous ? COLORS.anon : COLORS.staff)
    .setAuthor({ name: `${guild.name} — ${displayName}`, iconURL: displayAvatar })
    .setDescription(message)
    .setFooter({ text: anonymous ? "Anonymous Reply" : `Staff Reply • ${guild.name}` })
    .setTimestamp();

  if (attachments.length > 0) {
    embed.addFields({ name: "📎 Attachments", value: attachments.map((a, i) => `[Attachment ${i + 1}](${a})`).join("\n") });
  }

  await user.send({ embeds: [embed] });
}

// ============================================================
//  Close a thread
// ============================================================
async function closeThread(client, guild, channel, closedBy, guildDb, reason = "No reason provided.", delay = 0) {
  const ModmailConfigModel = ModmailConfig(guildDb.connection);
  const ModmailThreadModel = ModmailThread(guildDb.connection);

  const thread = await ModmailThreadModel.findOne({ channelId: channel.id, status: { $ne: "closed" } });
  if (!thread) return { error: "This is not an active modmail thread." };

  const config = await ModmailConfigModel.findOne({ guildId: guild.id });

  const doClose = async () => {
    // Generate transcript
    await generateTranscript(client, guild, channel, thread, closedBy, guildDb, config);

    // Update thread status
    await ModmailThreadModel.findOneAndUpdate(
      { channelId: channel.id },
      { $set: { status: "closed", closedBy: closedBy.id, closeReason: reason, autoCloseAt: null } }
    );

    // DM user close message
    const user = await client.users.fetch(thread.userId).catch(() => null);
    if (user) {
      const closeEmbed = new EmbedBuilder()
        .setColor(COLORS.closed)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTitle("🔒 Thread Closed")
        .setDescription(config?.closeMessage ?? "Your modmail thread has been closed.")
        .addFields(
          { name: "Closed by", value: closedBy.id === client.user.id ? "System (Auto-close)" : closedBy.tag, inline: true },
          { name: "Reason",    value: reason, inline: true },
        )
        .setFooter({ text: "You can DM the bot again to open a new thread." })
        .setTimestamp();
      await user.send({ embeds: [closeEmbed] }).catch(() => {});
    }

    // Archive or delete channel
    if (config?.archiveCategoryId) {
      await channel.setParent(config.archiveCategoryId, { lockPermissions: false });
      await channel.permissionOverwrites.set([
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        ...(config.alertRoleId ? [{ id: config.alertRoleId, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] }] : []),
      ]);

      const closedEmbed = new EmbedBuilder()
        .setColor(COLORS.closed)
        .setTitle("🔒 Thread Closed")
        .setDescription(`This thread has been closed by **${closedBy.id === client.user.id ? "System" : closedBy.tag}**.\n**Reason:** ${reason}`)
        .setTimestamp();

      await channel.send({ embeds: [closedEmbed] });
    } else {
      setTimeout(() => channel.delete().catch(() => {}), 5000);
    }

    await sendModmailLog(client, guild, guildDb, "closed", thread, null, closedBy, reason);
  };

  if (delay > 0) {
    // Send warning
    const user = await client.users.fetch(thread.userId).catch(() => null);
    const warnEmbed = new EmbedBuilder()
      .setColor(COLORS.system)
      .setTitle("⚠️ Thread Closing Soon")
      .setDescription(`This thread will be **automatically closed in ${formatDelay(delay)}**.\nSend a message to cancel the close.`)
      .setTimestamp();

    await channel.send({ embeds: [warnEmbed] });
    if (user) await user.send({ embeds: [warnEmbed] }).catch(() => {});

    const closeTime = new Date(Date.now() + delay);
    await ModmailThreadModel.findOneAndUpdate(
      { channelId: channel.id },
      { $set: { autoCloseAt: closeTime, warnSent: true } }
    );
  } else {
    await doClose();
  }

  return { success: true };
}

// ============================================================
//  Generate and send transcript
// ============================================================
async function generateTranscript(client, guild, channel, thread, closedBy, guildDb, config) {
  try {
    const messages = [];
    let lastId;

    while (true) {
      const opts = { limit: 100 };
      if (lastId) opts.before = lastId;
      const batch = await channel.messages.fetch(opts);
      if (batch.size === 0) break;
      messages.unshift(...batch.values());
      lastId = batch.last()?.id;
      if (batch.size < 100) break;
    }

    const lines = [
      `╔══════════════════════════════════════════╗`,
      `║         MODMAIL THREAD TRANSCRIPT         ║`,
      `╚══════════════════════════════════════════╝`,
      ``,
      `  Server   : ${guild.name} (${guild.id})`,
      `  Thread   : #${String(thread.threadNumber).padStart(4, "0")}`,
      `  User     : ${thread.userTag} (${thread.userId})`,
      `  Closed by: ${closedBy.id === client.user.id ? "System" : closedBy.tag}`,
      `  Messages : ${messages.length}`,
      `  Date     : ${new Date().toUTCString()}`,
      ``,
      `──────────────────────────────────────────────`,
      ``,
    ];

    for (const msg of messages) {
      if (msg.author.bot && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        lines.push(`[${msg.createdAt.toUTCString()}] ${embed.author?.name ?? "System"}`);
        if (embed.description) lines.push(`  ${embed.description}`);
        lines.push("");
      } else if (!msg.author.bot) {
        lines.push(`[${msg.createdAt.toUTCString()}] ${msg.author.tag}`);
        if (msg.content) lines.push(`  ${msg.content}`);
        lines.push("");
      }
    }

    const buffer     = Buffer.from(lines.join("\n"), "utf-8");
    const attachment = new AttachmentBuilder(buffer, { name: `modmail-${String(thread.threadNumber).padStart(4, "0")}.txt` });

    const transcriptEmbed = new EmbedBuilder()
      .setColor(COLORS.system)
      .setTitle(`📄 Modmail Transcript — #${String(thread.threadNumber).padStart(4, "0")}`)
      .addFields(
        { name: "User",      value: `${thread.userTag} (<@${thread.userId}>)`, inline: true },
        { name: "Closed by", value: closedBy.id === client.user.id ? "System" : closedBy.tag, inline: true },
        { name: "Messages",  value: `${messages.length}`, inline: true },
      )
      .setTimestamp();

    // Send to log channel
    if (config?.logChannelId) {
      const logChannel = guild.channels.cache.get(config.logChannelId);
      if (logChannel) await logChannel.send({ embeds: [transcriptEmbed], files: [attachment] });
    }

    // DM transcript to user
    const user = await client.users.fetch(thread.userId).catch(() => null);
    if (user) {
      const dmBuffer = Buffer.from(lines.join("\n"), "utf-8");
      const dmAttachment = new AttachmentBuilder(dmBuffer, { name: `modmail-${String(thread.threadNumber).padStart(4, "0")}.txt` });
      await user.send({ embeds: [transcriptEmbed], files: [dmAttachment] }).catch(() => {});
    }
  } catch (err) {
    console.error("[ModmailUtils] Transcript error:", err.message);
  }
}

// ============================================================
//  Send modmail log
// ============================================================
async function sendModmailLog(client, guild, guildDb, action, thread, user, closedBy, reason) {
  try {
    const ModmailConfigModel = ModmailConfig(guildDb.connection);
    const config = await ModmailConfigModel.findOne({ guildId: guild.id });
    if (!config?.logChannelId) return;

    const logChannel = guild.channels.cache.get(config.logChannelId);
    if (!logChannel) return;

    const colors = { opened: COLORS.open, closed: COLORS.closed };
    const embed  = new EmbedBuilder()
      .setColor(colors[action] ?? 0x99AAB5)
      .setTitle(`${STATUS_EMOJIS[action === "opened" ? "open" : "closed"]} Thread ${capitalise(action)}`)
      .addFields(
        { name: "Thread",   value: `#${String(thread.threadNumber).padStart(4, "0")}`, inline: true },
        { name: "User",     value: `${thread.userTag} (<@${thread.userId}>)`,          inline: true },
        ...(closedBy ? [{ name: "Closed by", value: closedBy.tag, inline: true }] : []),
        ...(reason   ? [{ name: "Reason",    value: reason,       inline: false }] : []),
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  Check auto-close timers
// ============================================================
async function checkModmailAutoClose(client) {
  for (const [guildId] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;

      const ModmailThreadModel = ModmailThread(guildDb.connection);
      const threads = await ModmailThreadModel.find({
        guildId,
        status:      { $ne: "closed" },
        autoCloseAt: { $lte: new Date() },
      });

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      for (const thread of threads) {
        const channel = guild.channels.cache.get(thread.channelId);
        if (channel) {
          await closeThread(client, guild, channel, client.user, guildDb, "Scheduled auto-close.");
        }
      }
    } catch {}
  }

  setTimeout(() => checkModmailAutoClose(client), 60 * 1000); // every minute
}

// ── Helpers ───────────────────────────────────────────────
function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDelay(ms) {
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

module.exports = {
  openThread,
  relayToThread,
  relayToUser,
  closeThread,
  generateTranscript,
  sendModmailLog,
  checkModmailAutoClose,
  COLORS,
  PRIORITY_COLORS,
  PRIORITY_EMOJIS,
  STATUS_EMOJIS,
};
