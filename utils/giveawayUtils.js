// ============================================================
//  utils/giveawayUtils.js
//  Core giveaway system logic
// ============================================================
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { fromConnection: Giveaway }       = require("../models/Giveaway");
const { fromConnection: GiveawayConfig } = require("../models/GiveawayConfig");
const { parseDuration, formatDuration }  = require("./modUtils");

// ── Colors ────────────────────────────────────────────────
const COLORS = {
  active: 0x5865F2,
  paused: 0xFEE75C,
  ended:  0xED4245,
};

// ============================================================
//  Check if user can host giveaways
// ============================================================
async function canHost(client, guild, member, guildDb) {
  if (member.permissions.has("ManageGuild")) return true;
  if (member.id === guild.ownerId) return true;

  const GiveawayConfigModel = GiveawayConfig(guildDb.connection);
  const config = await GiveawayConfigModel.findOne({ guildId: guild.id });
  if (!config) return false;

  if (config.hostUsers.includes(member.id)) return true;
  if (config.hostRoles.some(r => member.roles.cache.has(r))) return true;

  return false;
}

// ============================================================
//  Build giveaway embed
// ============================================================
function buildEmbed(giveaway, status = null) {
  const s      = status ?? giveaway.status;
  const color  = COLORS[s] ?? COLORS.active;
  const ended  = s === "ended";
  const paused = s === "paused";

  const uniqueEntrants = new Set(giveaway.entries).size;
  const timeStr = ended
    ? "Ended"
    : paused
      ? "⏸️ Paused"
      : `<t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎉 ${giveaway.prize}`)
    .addFields(
      { name: "🏆 Winners",    value: `\`${giveaway.winnerCount}\``,                          inline: true },
      { name: "⏰ Ends",       value: timeStr,                                                 inline: true },
      { name: "👤 Hosted by",  value: `<@${giveaway.hostId}>`,                                inline: true },
      { name: "🎟️ Entries",    value: `\`${uniqueEntrants}\` participant${uniqueEntrants !== 1 ? "s" : ""}`, inline: true },
    );

  // Requirements
  if (giveaway.requiredRoles.length > 0) {
    embed.addFields({
      name:  "✅ Required Roles",
      value: giveaway.requiredRoles.map(r => `<@&${r}>`).join(", "),
      inline: false,
    });
  }

  // Bonus entries
  if (giveaway.bonusEntries.length > 0) {
    embed.addFields({
      name:  "⭐ Bonus Entries",
      value: giveaway.bonusEntries.map(b => `<@&${b.roleId}> → **+${b.entries}** entries`).join("\n"),
      inline: false,
    });
  }

  // Blacklist info
  if (giveaway.blacklistRoles.length > 0 || giveaway.blacklistUsers.length > 0) {
    const bl = [
      ...giveaway.blacklistRoles.map(r => `<@&${r}>`),
      ...giveaway.blacklistUsers.map(u => `<@${u}>`),
    ].join(", ");
    embed.addFields({ name: "🚫 Blacklisted", value: bl, inline: false });
  }

  // Winners
  if (ended && giveaway.winners.length > 0) {
    embed.addFields({
      name:  "🎊 Winners",
      value: giveaway.winners.map(w => `<@${w}>`).join(", "),
      inline: false,
    });
    embed.setFooter({ text: `Giveaway ended • ${giveaway.winnerCount} winner(s) drawn` });
  } else if (ended) {
    embed.addFields({ name: "🎊 Winners", value: "No valid entries!", inline: false });
    embed.setFooter({ text: "Giveaway ended • No winners" });
  } else {
    embed.setFooter({ text: `Click 🎉 to enter! • Ends` });
    embed.setTimestamp(giveaway.endsAt);
  }

  return embed;
}

// ============================================================
//  Build giveaway action row
// ============================================================
function buildRow(giveaway) {
  const ended  = giveaway.status === "ended";
  const paused = giveaway.status === "paused";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`gw_enter_${giveaway.messageId}`)
      .setLabel(ended ? "Giveaway Ended" : paused ? "⏸️ Paused" : "🎉 Enter Giveaway")
      .setStyle(ended ? ButtonStyle.Secondary : paused ? ButtonStyle.Secondary : ButtonStyle.Primary)
      .setDisabled(ended || paused),
  );
}

// ============================================================
//  Draw winners from entries
// ============================================================
function drawWinners(entries, count) {
  if (entries.length === 0) return [];

  const pool     = [...entries]; // weighted entries array
  const winners  = new Set();
  const attempts = Math.min(count, new Set(entries).size);

  while (winners.size < attempts && pool.length > 0) {
    const idx    = Math.floor(Math.random() * pool.length);
    const winner = pool[idx];
    winners.add(winner);
    // Remove ALL entries of this winner to prevent winning twice
    pool.splice(0, pool.length, ...pool.filter(e => e !== winner));
  }

  return [...winners];
}

// ============================================================
//  End a giveaway and draw winners
// ============================================================
async function endGiveaway(client, giveaway, guildDb, channel) {
  const GiveawayModel = Giveaway(guildDb.connection);

  const winners = drawWinners(giveaway.entries, giveaway.winnerCount);

  await GiveawayModel.findOneAndUpdate(
    { messageId: giveaway.messageId },
    { $set: { status: "ended", winners } }
  );

  giveaway.status  = "ended";
  giveaway.winners = winners;

  // Update message
  try {
    const msg = await channel.messages.fetch(giveaway.messageId);
    await msg.edit({ embeds: [buildEmbed(giveaway)], components: [buildRow(giveaway)] });
  } catch {}

  // Announce winners
  const winnerMentions = winners.map(w => `<@${w}>`).join(", ");
  const announcement   = winners.length > 0
    ? `🎊 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!`
    : "😢 No valid entries were found for this giveaway.";

  await channel.send({ content: announcement }).catch(() => {});

  // DM winners
  if (giveaway.dmWinners && winners.length > 0) {
    const guild = client.guilds.cache.get(giveaway.guildId);
    for (const winnerId of winners) {
      const user = await client.users.fetch(winnerId).catch(() => null);
      if (!user) continue;

      const dmEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🎉 You Won a Giveaway!")
        .setDescription(`You won **${giveaway.prize}** in **${guild?.name ?? "a server"}**!`)
        .addFields({ name: "Server", value: guild?.name ?? "Unknown", inline: true })
        .setTimestamp();

      await user.send({ embeds: [dmEmbed] }).catch(() => {});
    }
  }

  return winners;
}

// ============================================================
//  Check and end expired giveaways — runs periodically
// ============================================================
async function checkGiveaways(client) {
  for (const [guildId] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;

      const GiveawayModel = Giveaway(guildDb.connection);
      const expired = await GiveawayModel.find({
        guildId,
        status:  "active",
        endsAt:  { $lte: new Date() },
      });

      for (const giveaway of expired) {
        const guild   = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(giveaway.channelId);
        if (!channel) continue;

        await endGiveaway(client, giveaway, guildDb, channel);
      }

      // Update live entry counts for active giveaways
      const active = await GiveawayModel.find({ guildId, status: "active" });
      for (const giveaway of active) {
        const guild   = client.guilds.cache.get(guildId);
        const channel = guild?.channels.cache.get(giveaway.channelId);
        if (!channel) continue;

        try {
          const msg = await channel.messages.fetch(giveaway.messageId);
          await msg.edit({ embeds: [buildEmbed(giveaway)], components: [buildRow(giveaway)] });
        } catch {}
      }
    } catch {}
  }

  // Run every 30 seconds
  setTimeout(() => checkGiveaways(client), 30_000);
}

module.exports = {
  canHost,
  buildEmbed,
  buildRow,
  drawWinners,
  endGiveaway,
  checkGiveaways,
  parseDuration,
  formatDuration,
  COLORS,
};
