// ============================================================
//  commands/info/serverinfo.js
//  Shows detailed information about the server
// ============================================================
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");

const VERIFICATION_LEVELS = {
  0: "None",
  1: "Low",
  2: "Medium",
  3: "High",
  4: "Highest",
};

const BOOST_TIERS = {
  0: "No Tier",
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
};

module.exports = {
  name:             "serverinfo",
  description:      "View detailed information about this server.",
  category:         "info",
  aliases:          ["si", "guildinfo"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View detailed information about this server.")
    .toJSON(),

  async execute(client, ctx) {
    const guild  = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    // Fetch full guild to get all data including banner
    const fullGuild = await guild.fetch();

    // Channel counts
    const channels      = guild.channels.cache;
    const textChannels  = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories    = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const totalChannels = channels.size;

    // Member counts
    const totalMembers  = guild.memberCount;
    const botCount      = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount    = totalMembers - botCount;

    // Roles (exclude @everyone)
    const roleCount = guild.roles.cache.size - 1;

    // Emoji counts
    const emojiCount    = guild.emojis.cache.size;
    const animatedEmoji = guild.emojis.cache.filter(e => e.animated).size;
    const staticEmoji   = emojiCount - animatedEmoji;

    // Owner
    const owner = await guild.fetchOwner().catch(() => null);

    // Creation date
    const createdAt = Math.floor(guild.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setAuthor({
        name:    guild.name,
        iconURL: guild.iconURL({ dynamic: true }) ?? undefined,
      })
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .addFields(
        {
          name:  "📋 General",
          value: [
            `**Owner:** ${owner ? `${owner.user.tag}` : "Unknown"} (<@${guild.ownerId}>)`,
            `**Created:** <t:${createdAt}:F> (<t:${createdAt}:R>)`,
            `**Verification:** ${VERIFICATION_LEVELS[guild.verificationLevel] ?? "Unknown"}`,
            `**ID:** \`${guild.id}\``,
          ].join("\n"),
          inline: false,
        },
        {
          name:  "👥 Members",
          value: [
            `**Total:** \`${totalMembers.toLocaleString()}\``,
            `**Humans:** \`${humanCount.toLocaleString()}\``,
            `**Bots:** \`${botCount.toLocaleString()}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "📢 Channels",
          value: [
            `**Total:** \`${totalChannels}\``,
            `**Text:** \`${textChannels}\``,
            `**Voice:** \`${voiceChannels}\``,
            `**Categories:** \`${categories}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "✨ Other",
          value: [
            `**Roles:** \`${roleCount}\``,
            `**Emojis:** \`${staticEmoji}\` static · \`${animatedEmoji}\` animated`,
          ].join("\n"),
          inline: true,
        },
        {
          name:  "🚀 Boosts",
          value: [
            `**Tier:** ${BOOST_TIERS[guild.premiumTier] ?? "None"}`,
            `**Boosts:** \`${guild.premiumSubscriptionCount ?? 0}\``,
          ].join("\n"),
          inline: true,
        },
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    // Add banner if exists
    if (fullGuild.bannerURL()) {
      embed.setImage(fullGuild.bannerURL({ size: 1024 }));
    }

    return reply(ctx, { embeds: [embed] });
  },
};
