// ============================================================
//  utils/ticketUtils.js
//  Core ticket system logic
//  - openTicket: creates ticket channel, sends intro embed
//  - closeTicket: generates transcript, closes channel
//  - generateTranscript: builds text transcript
//  - sendTranscript: uploads to transcript channel + DMs user
//  - checkAutoClose: checks inactive tickets
// ============================================================
const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ChannelType,
} = require("discord.js");

const { fromConnection: Ticket }         = require("../models/Ticket");
const { fromConnection: TicketCategory } = require("../models/TicketCategory");
const { fromConnection: TicketConfig }   = require("../models/TicketConfig");

// ============================================================
//  Open a ticket
// ============================================================
async function openTicket(client, guild, member, category, guildDb, formAnswers = {}) {
  const TicketModel         = Ticket(guildDb.connection);
  const TicketCategoryModel = TicketCategory(guildDb.connection);
  const TicketConfigModel   = TicketConfig(guildDb.connection);

  const config = await TicketConfigModel.findOne({ guildId: guild.id });

  // Check ticket limit
  const openTickets = await TicketModel.countDocuments({
    guildId: guild.id,
    userId:  member.id,
    status:  "open",
  });

  if (openTickets >= (config?.ticketLimit ?? 1)) {
    return { error: `You already have **${openTickets}** open ticket${openTickets === 1 ? "" : "s"}. Please close existing tickets before opening new ones.` };
  }

  // Increment ticket count
  const updatedCategory = await TicketCategoryModel.findByIdAndUpdate(
    category._id,
    { $inc: { ticketCount: 1 } },
    { new: true }
  );

  const ticketNumber = updatedCategory.ticketCount;

  // Build channel name from naming pattern
  const channelName = (category.namingPattern ?? "ticket-{number}")
    .replace("{number}", String(ticketNumber).padStart(4, "0"))
    .replace("{username}", member.user.username.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .toLowerCase();

  // Permission overwrites
  const permissionOverwrites = [
    {
      id:   guild.id, // @everyone
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id:     member.id,
      allow:  [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id:    client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  // Add support roles
  for (const roleId of category.supportRoles ?? []) {
    permissionOverwrites.push({
      id:    roleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  // Create channel
  const channel = await guild.channels.create({
    name:                 channelName,
    type:                 ChannelType.GuildText,
    parent:               category.channelCategory ?? null,
    permissionOverwrites,
    topic:                `Ticket #${ticketNumber} | ${member.user.tag} | Category: ${category.name}`,
  });

  // Save ticket to DB
  const ticket = await TicketModel.create({
    guildId:      guild.id,
    channelId:    channel.id,
    userId:       member.id,
    categoryId:   category._id.toString(),
    categoryName: category.name,
    ticketNumber,
    formAnswers:  new Map(Object.entries(formAnswers)),
  });

  // Build intro embed
  const color = parseInt((category.color ?? "#5865F2").replace("#", ""), 16);

  const introEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${category.emoji ?? "🎫"} ${category.name} — Ticket #${String(ticketNumber).padStart(4, "0")}`)
    .setDescription(
      `Welcome ${member}! A member of our support team will be with you shortly.\n\n` +
      `Please describe your issue in detail and we'll get back to you as soon as possible.`
    )
    .addFields(
      { name: "👤 Opened by", value: `${member.user.tag} (${member.id})`, inline: true },
      { name: "📂 Category",  value: category.name,                        inline: true },
    );

  // Add form answers if any
  if (Object.keys(formAnswers).length > 0) {
    const answers = Object.entries(formAnswers)
      .map(([q, a]) => `**${q}**\n${a}`)
      .join("\n\n");
    introEmbed.addFields({ name: "📋 Your Answers", value: answers.substring(0, 1024), inline: false });
  }

  introEmbed.setTimestamp();

  // Action buttons
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_close_${channel.id}`)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🔒"),
    new ButtonBuilder()
      .setCustomId(`ticket_claim_${channel.id}`)
      .setLabel("Claim")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✋"),
  );

  await channel.send({
    content: `${member} ${category.supportRoles.map(r => `<@&${r}>`).join(" ")}`,
    embeds:  [introEmbed],
    components: [row],
  });

  // DM user
  const dmEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎫 Ticket Opened — ${guild.name}`)
    .setDescription(`Your ticket has been opened in **${guild.name}**.\n\nHead to ${channel} to continue.`)
    .addFields({ name: "Category", value: category.name, inline: true })
    .setTimestamp();

  await member.user.send({ embeds: [dmEmbed] }).catch(() => {});

  // Log ticket opening
  await sendTicketLog(client, guild, guildDb, {
    action:   "opened",
    ticket,
    category,
    member,
    channel,
  });

  return { ticket, channel };
}

// ============================================================
//  Close a ticket
// ============================================================
async function closeTicket(client, guild, channel, closedBy, guildDb, reason = "No reason provided.") {
  const TicketModel       = Ticket(guildDb.connection);
  const TicketConfigModel = TicketConfig(guildDb.connection);

  const ticket = await TicketModel.findOne({ channelId: channel.id, status: "open" });
  if (!ticket) return { error: "This channel is not an active ticket." };

  const config = await TicketConfigModel.findOne({ guildId: guild.id });

  // Generate and send transcript first
  await generateAndSendTranscript(client, guild, channel, ticket, closedBy, guildDb, config);

  // Update ticket status
  await TicketModel.findOneAndUpdate(
    { channelId: channel.id },
    { $set: { status: "closed" } }
  );

  // DM ticket creator
  const creator = await client.users.fetch(ticket.userId).catch(() => null);
  if (creator) {
    const dmEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`🔒 Ticket Closed — ${guild.name}`)
      .setDescription(
        `Your ticket **#${String(ticket.ticketNumber).padStart(4, "0")}** in **${guild.name}** has been closed.\n\n` +
        `**Closed by:** ${closedBy.tag}\n**Reason:** ${reason}\n\n` +
        `A transcript has been sent to this DM.`
      )
      .setTimestamp();
    await creator.send({ embeds: [dmEmbed] }).catch(() => {});
  }

  // Log
  await sendTicketLog(client, guild, guildDb, {
    action:   "closed",
    ticket,
    closedBy,
    reason,
    channel,
  });

  // Delete channel after short delay
  setTimeout(() => channel.delete().catch(() => {}), 5000);

  return { success: true };
}

// ============================================================
//  Generate transcript and send
// ============================================================
async function generateAndSendTranscript(client, guild, channel, ticket, closedBy, guildDb, config) {
  try {
    // Fetch all messages
    const messages = [];
    let lastId;

    while (true) {
      const options = { limit: 100 };
      if (lastId) options.before = lastId;

      const batch = await channel.messages.fetch(options);
      if (batch.size === 0) break;

      messages.unshift(...batch.values());
      lastId = batch.last()?.id;
      if (batch.size < 100) break;
    }

    // Build text transcript
    const lines = [
      `═══════════════════════════════════════`,
      `  TICKET TRANSCRIPT`,
      `  Server  : ${guild.name} (${guild.id})`,
      `  Ticket  : #${String(ticket.ticketNumber).padStart(4, "0")}`,
      `  Category: ${ticket.categoryName}`,
      `  Opened by: ${ticket.userId}`,
      `  Closed by: ${closedBy.tag}`,
      `  Messages : ${messages.length}`,
      `  Date     : ${new Date().toUTCString()}`,
      `═══════════════════════════════════════`,
      "",
    ];

    for (const msg of messages) {
      const time    = msg.createdAt.toUTCString();
      const author  = `${msg.author.tag} (${msg.author.id})`;
      const content = msg.content || "(no text content)";

      lines.push(`[${time}] ${author}`);
      lines.push(`  ${content}`);

      if (msg.attachments.size > 0) {
        lines.push(`  Attachments: ${msg.attachments.map(a => a.url).join(", ")}`);
      }
      if (msg.embeds.length > 0) {
        lines.push(`  [${msg.embeds.length} embed(s)]`);
      }
      lines.push("");
    }

    const transcriptText   = lines.join("\n");
    const transcriptBuffer = Buffer.from(transcriptText, "utf-8");
    const attachment       = new AttachmentBuilder(transcriptBuffer, {
      name: `transcript-${String(ticket.ticketNumber).padStart(4, "0")}.txt`,
    });

    const transcriptEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📄 Ticket Transcript #${String(ticket.ticketNumber).padStart(4, "0")}`)
      .addFields(
        { name: "Category",   value: ticket.categoryName, inline: true },
        { name: "Opened by",  value: `<@${ticket.userId}>`, inline: true },
        { name: "Closed by",  value: closedBy.tag, inline: true },
        { name: "Messages",   value: `${messages.length}`, inline: true },
      )
      .setTimestamp();

    // Send to transcript channel
    if (config?.transcriptChannel) {
      const transcriptChannel = guild.channels.cache.get(config.transcriptChannel);
      if (transcriptChannel) {
        await transcriptChannel.send({ embeds: [transcriptEmbed], files: [attachment] });
      }
    }

    // DM transcript to creator
    const creator = await client.users.fetch(ticket.userId).catch(() => null);
    if (creator) {
      const dmBuffer = Buffer.from(transcriptText, "utf-8");
      const dmAttachment = new AttachmentBuilder(dmBuffer, {
        name: `transcript-${String(ticket.ticketNumber).padStart(4, "0")}.txt`,
      });
      await creator.send({ embeds: [transcriptEmbed], files: [dmAttachment] }).catch(() => {});
    }
  } catch (err) {
    console.error("[TicketUtils] Transcript error:", err.message);
  }
}

// ============================================================
//  Send ticket log
// ============================================================
async function sendTicketLog(client, guild, guildDb, data) {
  try {
    const TicketConfigModel = TicketConfig(guildDb.connection);
    const config = await TicketConfigModel.findOne({ guildId: guild.id });
    if (!config?.logChannel) return;

    const logChannel = guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const colors = { opened: 0x57F287, closed: 0xED4245 };
    const emojis = { opened: "🎫", closed: "🔒" };

    const embed = new EmbedBuilder()
      .setColor(colors[data.action] ?? 0x99AAB5)
      .setTitle(`${emojis[data.action]} Ticket ${capitalise(data.action)}`)
      .addFields(
        { name: "Ticket",   value: `#${String(data.ticket.ticketNumber).padStart(4, "0")}`, inline: true },
        { name: "Category", value: data.ticket.categoryName, inline: true },
        { name: "Channel",  value: data.channel ? `<#${data.channel.id}>` : "Deleted", inline: true },
        { name: "User",     value: `<@${data.ticket.userId}>`, inline: true },
        ...(data.closedBy ? [{ name: "Closed by", value: data.closedBy.tag, inline: true }] : []),
        ...(data.reason   ? [{ name: "Reason",    value: data.reason,      inline: false }] : []),
      )
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch {}
}

// ============================================================
//  Auto-close checker — runs periodically
// ============================================================
async function checkAutoClose(client) {
  for (const [guildId] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;

      const TicketConfigModel = TicketConfig(guildDb.connection);
      const TicketModel       = Ticket(guildDb.connection);

      const config = await TicketConfigModel.findOne({ guildId });
      if (!config?.autoCloseTime) continue;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const openTickets = await TicketModel.find({ guildId, status: "open" });
      const now         = Date.now();

      for (const ticket of openTickets) {
        const inactive = now - ticket.lastActivity.getTime();
        const warnTime = config.warnTime ?? config.autoCloseTime * 0.5;

        // Send warning
        if (!ticket.warnSent && inactive >= (config.autoCloseTime - warnTime)) {
          const channel = guild.channels.cache.get(ticket.channelId);
          if (channel) {
            const timeLeft = Math.ceil((config.autoCloseTime - inactive) / 60000);
            const warnEmbed = new EmbedBuilder()
              .setColor(0xFEE75C)
              .setTitle("⚠️ Inactivity Warning")
              .setDescription(
                `This ticket has been inactive and will be **automatically closed in ${timeLeft} minute${timeLeft === 1 ? "" : "s"}**.\n\n` +
                `Please send a message to keep it open.`
              )
              .setTimestamp();

            await channel.send({ content: `<@${ticket.userId}>`, embeds: [warnEmbed] }).catch(() => {});

            // DM user
            const user = await client.users.fetch(ticket.userId).catch(() => null);
            if (user) {
              await user.send({ embeds: [warnEmbed] }).catch(() => {});
            }

            await TicketModel.findOneAndUpdate(
              { channelId: ticket.channelId },
              { $set: { warnSent: true } }
            );
          }
        }

        // Auto close
        if (inactive >= config.autoCloseTime) {
          const channel = guild.channels.cache.get(ticket.channelId);
          if (channel) {
            await closeTicket(client, guild, channel, client.user, guildDb, "Ticket automatically closed due to inactivity.");
          }
        }
      }
    } catch {}
  }

  // Run every 5 minutes
  setTimeout(() => checkAutoClose(client), 5 * 60 * 1000);
}

function capitalise(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = {
  openTicket,
  closeTicket,
  generateAndSendTranscript,
  sendTicketLog,
  checkAutoClose,
};
