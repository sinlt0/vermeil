const { EmbedBuilder } = require("discord.js");
const { fromConnection: Reminder } = require("../models/Reminder");
const { formatDuration } = require("./modUtils");

async function checkReminders(client) {
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      const guildDb = await client.db.getGuildDb(guildId);
      if (!guildDb || guildDb.isDown) continue;

      const ReminderModel = Reminder(guildDb.connection);
      const dueReminders = await ReminderModel
        .find({ guildId, status: "active", dueAt: { $lte: new Date() } })
        .sort({ dueAt: 1 })
        .limit(25);

      for (const reminder of dueReminders) {
        await deliverReminder(client, guild, ReminderModel, reminder);
      }
    } catch {}
  }
}

async function deliverReminder(client, guild, ReminderModel, reminder) {
  const locked = await ReminderModel.findOneAndUpdate(
    { _id: reminder._id, status: "active" },
    { status: "sent" },
    { new: true }
  );
  if (!locked) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("⏰ Reminder")
    .setDescription(locked.message)
    .addFields({
      name: "Created",
      value: `<t:${Math.floor(locked.createdAt.getTime() / 1000)}:R>`,
      inline: true,
    })
    .setFooter({ text: `Reminder ID: ${shortId(locked._id)}` })
    .setTimestamp();

  const payload = {
    content: `<@${locked.userId}>`,
    embeds: [embed],
    allowedMentions: { users: [locked.userId] },
  };

  let sent = false;
  const channel = guild.channels.cache.get(locked.channelId) ?? await client.channels.fetch(locked.channelId).catch(() => null);
  if (channel?.isTextBased?.()) {
    await channel.send(payload).then(() => { sent = true; }).catch(() => {});
  }

  if (!sent) {
    const user = await client.users.fetch(locked.userId).catch(() => null);
    if (user) await user.send(payload).then(() => { sent = true; }).catch(() => {});
  }

  if (!sent) {
    await ReminderModel.findByIdAndUpdate(locked._id, { status: "failed" }).catch(() => {});
  }
}

function startReminderChecker(client) {
  checkReminders(client);
  setInterval(() => checkReminders(client), 30_000);
}

function shortId(id) {
  return id.toString().slice(-6).toUpperCase();
}

function formatReminderLine(reminder) {
  const remaining = reminder.dueAt.getTime() - Date.now();
  return `\`${shortId(reminder._id)}\` <t:${Math.floor(reminder.dueAt.getTime() / 1000)}:R> (${formatDuration(Math.max(0, remaining))}) — ${reminder.message.slice(0, 80)}`;
}

module.exports = {
  checkReminders,
  startReminderChecker,
  shortId,
  formatReminderLine,
};