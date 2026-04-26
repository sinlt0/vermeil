const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/devguildemoji");

module.exports = {
  name:             "guildpurge",
  description:      "Mass leave guilds using filters. (Owner/Dev only)",
  category:         "owner",
  aliases:          ["gpurge", "serverpurge"],
  usage:            "preview|run <less|more> <members> [name text] [--no-icon] [--include-current] [--confirm]",
  cooldown:         10,
  ownerOnly:        false,
  devOnly:          true,
  requiresDatabase: false,
  slash:            false,
  defer:            true,
  ephemeral:        true,

  slashData: new SlashCommandBuilder()
    .setName("guildpurge")
    .setDescription("Mass leave guilds using filters. Owner/Dev only.")
    .addSubcommand(s =>
      s.setName("preview")
        .setDescription("Preview guilds that match the filters.")
        .addStringOption(o => o.setName("comparison").setDescription("Member count filter.").setRequired(true).addChoices(
          { name: "Less than", value: "less" },
          { name: "More than", value: "more" },
        ))
        .addIntegerOption(o => o.setName("members").setDescription("Member count threshold.").setRequired(true).setMinValue(0))
        .addStringOption(o => o.setName("name_contains").setDescription("Only include guild names containing this text.").setRequired(false))
        .addBooleanOption(o => o.setName("no_icon").setDescription("Only include guilds without an icon.").setRequired(false))
        .addBooleanOption(o => o.setName("include_current").setDescription("Allow the guild where this command is used.").setRequired(false))
    )
    .addSubcommand(s =>
      s.setName("run")
        .setDescription("Leave guilds that match the filters.")
        .addStringOption(o => o.setName("comparison").setDescription("Member count filter.").setRequired(true).addChoices(
          { name: "Less than", value: "less" },
          { name: "More than", value: "more" },
        ))
        .addIntegerOption(o => o.setName("members").setDescription("Member count threshold.").setRequired(true).setMinValue(0))
        .addBooleanOption(o => o.setName("confirm").setDescription("Must be true to leave matching guilds.").setRequired(true))
        .addStringOption(o => o.setName("name_contains").setDescription("Only include guild names containing this text.").setRequired(false))
        .addBooleanOption(o => o.setName("no_icon").setDescription("Only include guilds without an icon.").setRequired(false))
        .addBooleanOption(o => o.setName("include_current").setDescription("Allow the guild where this command is used.").setRequired(false))
    )
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const currentGuildId = ctx.type === "prefix" ? ctx.message.guild?.id : ctx.interaction.guild?.id;
    const options = parseOptions(ctx);
    if (!options) return reply(ctx, { embeds: [usageEmbed()] });

    const matches = getMatches(client, options, currentGuildId);
    const preview = buildPreview(matches);

    if (options.mode !== "run") {
      return reply(ctx, { embeds: [buildResultEmbed(author, options, matches, preview, false, [])] });
    }

    if (!options.confirm) {
      return reply(ctx, {
        embeds: [new EmbedBuilder()
          .setColor(0x4A3F5F)
          .setTitle(`${e.warning} Confirmation Required`)
          .setDescription("Run this command with confirmation enabled to leave the matching guilds.")
          .addFields({ name: `${e.filter} Matching Guilds`, value: matches.length ? `\`${matches.length}\`` : "`0`", inline: true })],
      });
    }

    const left = [];
    for (const guild of matches) {
      await guild.leave()
        .then(() => left.push(guild))
        .catch(() => {});
    }

    return reply(ctx, { embeds: [buildResultEmbed(author, options, matches, preview, true, left)] });
  },
};

function parseOptions(ctx) {
  if (ctx.type === "slash") {
    const sub = ctx.interaction.options.getSubcommand();
    return {
      mode: sub,
      comparison: ctx.interaction.options.getString("comparison"),
      members: ctx.interaction.options.getInteger("members"),
      nameContains: ctx.interaction.options.getString("name_contains"),
      noIcon: ctx.interaction.options.getBoolean("no_icon") ?? false,
      includeCurrent: ctx.interaction.options.getBoolean("include_current") ?? false,
      confirm: sub === "run" ? ctx.interaction.options.getBoolean("confirm") : false,
    };
  }

  const args = [...ctx.args];
  const mode = ["preview", "run"].includes((args[0] ?? "").toLowerCase()) ? args.shift().toLowerCase() : "preview";
  const comparison = (args.shift() ?? "").toLowerCase();
  const members = Number(args.shift());
  if (!["less", "more"].includes(comparison) || !Number.isFinite(members) || members < 0) return null;

  const raw = args.join(" ");
  return {
    mode,
    comparison,
    members,
    nameContains: raw.match(/--name\s+(.+?)(\s+--|$)/i)?.[1]?.trim() || null,
    noIcon: args.includes("--no-icon"),
    includeCurrent: args.includes("--include-current"),
    confirm: args.includes("--confirm"),
  };
}

function getMatches(client, options, currentGuildId) {
  return [...client.guilds.cache.values()].filter(guild => {
    const count = guild.memberCount ?? 0;
    if (!options.includeCurrent && guild.id === currentGuildId) return false;
    if (options.comparison === "less" && !(count < options.members)) return false;
    if (options.comparison === "more" && !(count > options.members)) return false;
    if (options.nameContains && !guild.name.toLowerCase().includes(options.nameContains.toLowerCase())) return false;
    if (options.noIcon && guild.icon) return false;
    return true;
  }).sort((a, b) => (a.memberCount ?? 0) - (b.memberCount ?? 0));
}

function buildPreview(matches) {
  if (!matches.length) return "No guilds match these filters.";
  return matches.slice(0, 15).map((guild, i) =>
    `\`${i + 1}.\` **${guild.name}** — \`${guild.id}\` • ${e.members} \`${(guild.memberCount ?? 0).toLocaleString()}\``
  ).join("\n") + (matches.length > 15 ? `\n...and ${matches.length - 15} more.` : "");
}

function buildResultEmbed(author, options, matches, preview, executed, left) {
  return new EmbedBuilder()
    .setColor(0x4A3F5F)
    .setTitle(executed ? `${e.purge} Guild Purge Complete` : `${e.filter} Guild Purge Preview`)
    .setDescription(preview)
    .addFields(
      { name: `${e.members} Member Filter`, value: `\`${options.comparison === "less" ? "<" : ">"} ${options.members.toLocaleString()}\``, inline: true },
      { name: `${e.guild} Matched`, value: `\`${matches.length.toLocaleString()}\``, inline: true },
      { name: `${e.leave} Left`, value: `\`${executed ? left.length.toLocaleString() : "0"}\``, inline: true },
      { name: `${e.filter} Extra Filters`, value: [
        options.nameContains ? `Name contains: \`${options.nameContains}\`` : null,
        options.noIcon ? "No icon only" : null,
        options.includeCurrent ? "Included current guild" : "Skipped current guild",
      ].filter(Boolean).join("\n") || "None", inline: false },
    )
    .setFooter({ text: `Requested by ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
}

function usageEmbed() {
  return new EmbedBuilder()
    .setColor(0x4A3F5F)
    .setTitle(`${e.error} Guild Purge Usage`)
    .setDescription("`guildpurge preview <less|more> <members> [--name text] [--no-icon]`\n`guildpurge run <less|more> <members> [--name text] [--no-icon] --confirm`");
}