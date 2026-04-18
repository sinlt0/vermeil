// ============================================================
//  commands/info/serverinfo.js
//  Premium server information command
// ============================================================
const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/infoemoji");

module.exports = {
  name:             "serverinfo",
  description:      "View detailed premium information about the current server.",
  category:         "info",
  aliases:          ["si", "server"],
  usage:            "",
  cooldown:         5,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("serverinfo")
    .setDescription("View detailed premium information about the current server.")
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;

    const owner = await guild.fetchOwner();
    const createdAt = Math.floor(guild.createdTimestamp / 1000);
    
    // ── Member Breakdown ──
    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter(m => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    // ── Channel Breakdown ──
    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categoryCount = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;

    // ── Misc ──
    const roleCount = guild.roles.cache.size;
    const emojiCount = guild.emojis.cache.size;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.server} ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
      .setImage(guild.bannerURL({ size: 1024 }))
      .addFields(
        {
          name: `${e.shield} General`,
          value: [
            `**Owner:** ${owner.user.tag}`,
            `**ID:** \`${guild.id}\``,
            `**Created:** <t:${createdAt}:R>`,
            `**Verification:** \`${guild.verificationLevel}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.team} Members`,
          value: [
            `**Total:** \`${totalMembers.toLocaleString()}\``,
            `**Humans:** \`${humanCount.toLocaleString()}\``,
            `**Bots:** \`${botCount.toLocaleString()}\``,
            `**Roles:** \`${roleCount}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.help} Channels`,
          value: [
            `**Text:** \`${textChannels}\``,
            `**Voice:** \`${voiceChannels}\``,
            `**Categories:** \`${categoryCount}\``,
            `**Emojis:** \`${emojiCount}\``,
          ].join("\n"),
          inline: true,
        },
        {
          name: `${e.star} Boost Status`,
          value: `Level \`${boostTier}\` with \`${boostCount}\` boosts.`,
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