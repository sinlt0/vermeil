// ============================================================
//  commands/info/userinfo.js
//  Shows detailed info about a user
//  Works on server members AND external users by ID
//  Different embed shown if user is not in the server
// ============================================================
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds    = require("../../utils/embeds");

module.exports = {
  name:             "userinfo",
  description:      "View detailed information about a user.",
  category:         "info",
  aliases:          ["ui", "whois"],
  usage:            "[@user|userID]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("View detailed information about a user.")
    .addStringOption(o =>
      o.setName("user")
        .setDescription("Mention, username or user ID.")
        .setRequired(false)
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild  : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    // ── Resolve target ─────────────────────────────────
    let targetUser   = null;
    let targetMember = null;

    if (ctx.type === "prefix") {
      const mention = ctx.message.mentions.users.first();
      if (mention) {
        targetUser   = mention;
        targetMember = ctx.message.mentions.members.first();
      } else if (ctx.args[0]) {
        // Try ID or username search
        const query = ctx.args[0];
        if (/^\d{17,19}$/.test(query)) {
          // ID — try to fetch user globally
          targetUser   = await client.users.fetch(query).catch(() => null);
          targetMember = await guild.members.fetch(query).catch(() => null);
          if (targetMember) targetUser = targetMember.user;
        } else {
          // Username search within server
          targetMember = guild.members.cache.find(m =>
            m.user.username.toLowerCase() === query.toLowerCase() ||
            m.displayName.toLowerCase()   === query.toLowerCase()
          );
          if (targetMember) targetUser = targetMember.user;
        }
      } else {
        targetUser   = author;
        targetMember = ctx.message.member;
      }
    } else {
      const input = ctx.interaction.options.getString("user");
      if (input) {
        if (/^\d{17,19}$/.test(input.trim())) {
          targetUser   = await client.users.fetch(input.trim()).catch(() => null);
          targetMember = await guild.members.fetch(input.trim()).catch(() => null);
          if (targetMember) targetUser = targetMember.user;
        } else {
          targetMember = guild.members.cache.find(m =>
            m.user.username.toLowerCase() === input.toLowerCase() ||
            m.displayName.toLowerCase()   === input.toLowerCase()
          );
          if (targetMember) targetUser = targetMember.user;
        }
      } else {
        targetUser   = ctx.interaction.user;
        targetMember = ctx.interaction.member;
      }
    }

    if (!targetUser) {
      return reply(ctx, { embeds: [embeds.error("User not found. Please provide a valid mention, username or user ID.")] });
    }

    // Fetch full user to get banner
    const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => targetUser);

    const createdAt = Math.floor(targetUser.createdTimestamp / 1000);

    // ── NOT IN SERVER — limited embed ──────────────────
    if (!targetMember) {
      const embed = new EmbedBuilder()
        .setColor(0x99AAB5)
        .setAuthor({
          name:    targetUser.tag,
          iconURL: targetUser.displayAvatarURL({ dynamic: true }),
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setDescription("⚠️ This user is **not in this server**. Showing limited information.")
        .addFields(
          { name: "👤 Username",      value: targetUser.username,                           inline: true  },
          { name: "🏷️ Display Name",  value: targetUser.displayName,                        inline: true  },
          { name: "🤖 Bot",           value: targetUser.bot ? "✅ Yes" : "❌ No",            inline: true  },
          { name: "🆔 User ID",       value: `\`${targetUser.id}\``,                        inline: true  },
          { name: "📅 Account Created",value: `<t:${createdAt}:F>\n<t:${createdAt}:R>`,    inline: false },
        )
        .setFooter({
          text:    `Requested by ${author.tag}`,
          iconURL: author.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      // Banner if available
      if (fullUser.bannerURL()) {
        embed.setImage(fullUser.bannerURL({ size: 1024 }));
      }

      return reply(ctx, { embeds: [embed] });
    }

    // ── IN SERVER — full embed ─────────────────────────
    const joinedAt  = Math.floor(targetMember.joinedTimestamp / 1000);

    // Roles (exclude @everyone, sort by position)
    const roles = targetMember.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position);

    const roleList = roles.size > 0
      ? roles.map(r => `<@&${r.id}>`).join(" ").substring(0, 1024)
      : "No roles";

    // Boost status
    const boostSince = targetMember.premiumSince
      ? `<t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>`
      : "Not boosting";

    // Highest role color
    const highestRole  = targetMember.roles.highest;
    const embedColor   = highestRole?.color || 0x5865F2;

    // Join position
    const joinPosition = (await guild.members.fetch())
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp)
      .map(m => m.id)
      .indexOf(targetMember.id) + 1;

    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({
        name:    targetUser.tag,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name:  "👤 User",
          value: [
            `**Username:** ${targetUser.username}`,
            `**Display Name:** ${targetUser.displayName}`,
            `**Nickname:** ${targetMember.nickname ?? "None"}`,
            `**Bot:** ${targetUser.bot ? "✅ Yes" : "❌ No"}`,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "🆔 IDs",
          value: [
            `**User ID:** \`${targetUser.id}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "📅 Dates",
          value: [
            `**Account Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)`,
            `**Joined Server:** <t:${joinedAt}:F> (<t:${joinedAt}:R>)`,
            `**Join Position:** \`#${joinPosition}\``,
          ].join("\n"),
          inline: false,
        },
        {
          name:  "🚀 Boost",
          value: boostSince,
          inline: true,
        },
        {
          name:  `🎭 Roles [${roles.size}]`,
          value: roleList,
          inline: false,
        },
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Banner if available
    if (fullUser.bannerURL()) {
      embed.setImage(fullUser.bannerURL({ size: 1024 }));
    }

    return reply(ctx, { embeds: [embed] });
  },
};
