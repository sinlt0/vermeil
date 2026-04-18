const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { parseDuration, formatDuration } = require("../../utils/modUtils");
const { fromConnection: Reminder } = require("../../models/Reminder");
const { shortId, formatReminderLine } = require("../../utils/reminderUtils");
const e = require("../../emojis/utilityemoji");

const MIN_DURATION = 10_000;
const MAX_DURATION = 365 * 24 * 60 * 60 * 1000;

module.exports = {
  name:             "reminder",
  description:      "Set, list, or cancel reminders.",
  category:         "utility",
  aliases:          ["remind", "reminders"],
  usage:            "set <time> <message> | list | cancel <id>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("reminder")
    .setDescription("Set, list, or cancel reminders.")
    .addSubcommand(s =>
      s.setName("set")
        .setDescription("Create a reminder.")
        .addStringOption(o => o.setName("time").setDescription("Example: 10m, 2h, 1d").setRequired(true))
        .addStringOption(o => o.setName("message").setDescription("What should I remind you about?").setRequired(true))
    )
    .addSubcommand(s =>
      s.setName("list")
        .setDescription("List your active reminders.")
    )
    .addSubcommand(s =>
      s.setName("cancel")
        .setDescription("Cancel one of your reminders.")
        .addStringOption(o => o.setName("id").setDescription("Reminder ID from reminder list.").setRequired(true))
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const user = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    if (!guild) {
      return reply(ctx, { embeds: [makeError("Reminders can only be used inside a server.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) {
      return reply(ctx, { embeds: [makeError("The database is not available right now. Please try again later.")] });
    }

    const ReminderModel = Reminder(guildDb.connection);
    const action = getAction(ctx);

    if (action === "set") return setReminder(ctx, ReminderModel, guild.id, channel.id, user);
    if (action === "list") return listReminders(ctx, ReminderModel, user);
    if (action === "cancel") return cancelReminder(ctx, ReminderModel, user);

    return reply(ctx, { embeds: [makeError("Usage: `reminder set <time> <message>`, `reminder list`, or `reminder cancel <id>`.")] });
  },
};

async function setReminder(ctx, ReminderModel, guildId, channelId, user) {
  const { time, message } = getSetInput(ctx);
  const duration = parseDuration(time);

  if (!duration) return reply(ctx, { embeds: [makeError("Invalid time. Examples: `10m`, `2h`, `1d`, `1d2h30m`.")] });
  if (duration < MIN_DURATION) return reply(ctx, { embeds: [makeError("Reminder time must be at least 10 seconds.")] });
  if (duration > MAX_DURATION) return reply(ctx, { embeds: [makeError("Reminder time cannot be longer than 365 days.")] });
  if (!message || message.length < 2) return reply(ctx, { embeds: [makeError("Please provide a reminder message.")] });
  if (message.length > 500) return reply(ctx, { embeds: [makeError("Reminder messages cannot be longer than 500 characters.")] });

  const activeCount = await ReminderModel.countDocuments({ userId: user.id, status: "active" });
  if (activeCount >= 25) return reply(ctx, { embeds: [makeError("You can only have 25 active reminders at a time.")] });

  const dueAt = new Date(Date.now() + duration);
  const reminder = await ReminderModel.create({
    guildId,
    channelId,
    userId: user.id,
    message,
    dueAt,
  });

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`${e.clock} Reminder Set`)
    .setDescription(message)
    .addFields(
      { name: "When", value: `<t:${Math.floor(dueAt.getTime() / 1000)}:F>\n<t:${Math.floor(dueAt.getTime() / 1000)}:R>`, inline: false },
      { name: "Duration", value: `\`${formatDuration(duration)}\``, inline: true },
      { name: "ID", value: `\`${shortId(reminder._id)}\``, inline: true },
    )
    .setFooter({
      text:    `Requested by ${user.tag}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return reply(ctx, { embeds: [embed] });
}

async function listReminders(ctx, ReminderModel, user) {
  const reminders = await ReminderModel
    .find({ userId: user.id, status: "active" })
    .sort({ dueAt: 1 })
    .limit(25);

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle(`${e.list} Your Reminders`)
    .setDescription(
      reminders.length
        ? reminders.map(formatReminderLine).join("\n")
        : "You do not have any active reminders."
    )
    .setFooter({
      text:    `Requested by ${user.tag}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return reply(ctx, { embeds: [embed] });
}

async function cancelReminder(ctx, ReminderModel, user) {
  const id = getCancelId(ctx);
  if (!id) return reply(ctx, { embeds: [makeError("Please provide a reminder ID from `reminder list`.")] });

  const reminders = await ReminderModel.find({ userId: user.id, status: "active" });
  const reminder = reminders.find(r => shortId(r._id).toLowerCase() === id.toLowerCase() || r._id.toString() === id);

  if (!reminder) {
    return reply(ctx, { embeds: [makeError("I could not find an active reminder with that ID.")] });
  }

  await ReminderModel.findByIdAndUpdate(reminder._id, { status: "cancelled" });

  const embed = new EmbedBuilder()
    .setColor(0x57F287)
    .setTitle(`${e.trash} Reminder Cancelled`)
    .setDescription(reminder.message)
    .addFields({ name: "ID", value: `\`${shortId(reminder._id)}\``, inline: true })
    .setFooter({
      text:    `Requested by ${user.tag}`,
      iconURL: user.displayAvatarURL({ dynamic: true }),
    })
    .setTimestamp();

  return reply(ctx, { embeds: [embed] });
}

function getAction(ctx) {
  if (ctx.type === "prefix") {
    const action = (ctx.args[0] ?? "set").toLowerCase();
    return ["set", "list", "cancel"].includes(action) ? action : "set";
  }
  return ctx.interaction.options.getSubcommand();
}

function getSetInput(ctx) {
  if (ctx.type === "prefix") {
    const args = [...ctx.args];
    if ((args[0] ?? "").toLowerCase() === "set") args.shift();
    return {
      time: args.shift(),
      message: args.join(" ").trim(),
    };
  }

  return {
    time: ctx.interaction.options.getString("time"),
    message: ctx.interaction.options.getString("message"),
  };
}

function getCancelId(ctx) {
  if (ctx.type === "prefix") return ctx.args[1] ?? ctx.args[0];
  return ctx.interaction.options.getString("id");
}

function makeError(message) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(`${e.warning} Reminder Error`)
    .setDescription(message);
}