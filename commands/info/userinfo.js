// ============================================================
//  commands/info/userinfo.js
//  Premium user information command
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/infoemoji");

module.exports = {
  name:             "userinfo",
  description:      "View detailed premium information about a user.",
  category:         "info",
  aliases:          ["ui", "whois", "user"],
  usage:            "[@user]",
  cooldown:         5,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View detailed premium information about a user.")
    .addUserOption(o => o.setName("user").setDescription("The user to view info for.").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const user = ctx.type === "prefix" 
      ? (ctx.message.mentions.users.first() || ctx.message.author)
      : (ctx.interaction.options.getUser("user") || ctx.interaction.user);
    
    const member = await ctx.guild.members.fetch(user.id).catch(() => null);
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const createdAt = Math.floor(user.createdTimestamp / 1000);
    const joinedAt = member ? Math.floor(member.joinedTimestamp / 1000) : null;
    
    // ── Role List ──
    const roles = member 
      ? member.roles.cache
        .filter(r => r.id !== ctx.guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => r.toString())
      : [];

    const roleDisplay = roles.length > 10 
      ? `${roles.slice(0, 10).join(", ")} and ${roles.length - 10} more...`
      : roles.join(", ") || "None";

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.team} User Information`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name: `${e.bot} Identity`,
          value: [
            `**Tag:** ${user.tag}`,
            `**ID:** \`${user.id}\``,
            `**Bot:** \`${user.bot ? "Yes" : "No"}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.shield} Dates`,
          value: [
            `**Registered:** <t:${createdAt}:R>`,
            `**Joined Server:** ${joinedAt ? `<t:${joinedAt}:R>` : "Not a member"}`,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.command} Server Profile`,
          value: [
            `**Nickname:** ${member?.nickname || "None"}`,
            `**Highest Role:** ${member?.roles.highest.toString() || "None"}`,
          ].join("\n"),
          inline: false,
        },
        {
          name: `${e.help} Roles [${roles.length}]`,
          value: roleDisplay,
          inline: false,
        }
      )
      .setFooter({
        text: `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};