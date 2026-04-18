const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/devguildemoji");

module.exports = {
  name:             "guildleave",
  description:      "Make the bot leave a guild. (Owner/Dev only)",
  category:         "owner",
  aliases:          ["gleave", "serverleave"],
  usage:            "<guildId> [reason]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          true,
  requiresDatabase: false,
  slash:            false,
  defer:            true,
  ephemeral:        true,

  slashData: new SlashCommandBuilder()
    .setName("guildleave")
    .setDescription("Make the bot leave a guild. Owner/Dev only.")
    .addStringOption(o => o.setName("guild_id").setDescription("Guild/server ID.").setRequired(true))
    .addStringOption(o => o.setName("reason").setDescription("Reason for leaving.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const guildId = ctx.type === "prefix" ? ctx.args[0] : ctx.interaction.options.getString("guild_id");
    const reason = ctx.type === "prefix"
      ? ctx.args.slice(1).join(" ").trim() || "No reason provided."
      : ctx.interaction.options.getString("reason") || "No reason provided.";

    if (!guildId) return reply(ctx, { embeds: [errorEmbed("Please provide a guild ID.")] });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return reply(ctx, { embeds: [errorEmbed("I am not in a guild with that ID.")] });

    const name = guild.name;
    const members = guild.memberCount ?? 0;

    await guild.leave();

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`${e.leave} Left Guild`)
      .setDescription(`I have left **${name}**.`)
      .addFields(
        { name: `${e.id} Guild ID`, value: `\`${guildId}\``, inline: true },
        { name: `${e.members} Members`, value: `\`${members.toLocaleString()}\``, inline: true },
        { name: `${e.warning} Reason`, value: reason.slice(0, 1024), inline: false },
      )
      .setFooter({ text: `Requested by ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};

function errorEmbed(message) {
  return new EmbedBuilder().setColor(0xED4245).setTitle(`${e.error} Guild Leave Error`).setDescription(message);
}