const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/devguildemoji");

module.exports = {
  name:             "guildinvite",
  description:      "Create an invite for any guild the bot is in. (Owner/Dev only)",
  category:         "owner",
  aliases:          ["ginvite", "serverinvite"],
  usage:            "<guildId>",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          true,
  requiresDatabase: false,
  slash:            false,
  defer:            true,
  ephemeral:        false,

  slashData: new SlashCommandBuilder()
    .setName("guildinvite")
    .setDescription("Create an invite for any guild the bot is in. Owner/Dev only.")
    .addStringOption(o => o.setName("guild_id").setDescription("Guild/server ID.").setRequired(true))
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const guildId = ctx.type === "prefix" ? ctx.args[0] : ctx.interaction.options.getString("guild_id");
    if (!guildId) return reply(ctx, { embeds: [errorEmbed("Please provide a guild ID.")] });

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return reply(ctx, { embeds: [errorEmbed("I am not in a guild with that ID.")] });

    const channel = findInviteChannel(guild);
    if (!channel) {
      return reply(ctx, { embeds: [errorEmbed("I could not find a channel where I can create invites in that guild.")] });
    }

    const invite = await channel.createInvite({
      maxAge: 86400,
      maxUses: 1,
      unique: true,
      reason: `Guild invite requested by ${author.tag} (${author.id})`,
    }).catch(() => null);

    if (!invite) return reply(ctx, { embeds: [errorEmbed("Failed to create an invite. Check my Create Invite permission.")] });

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.invite} Guild Invite Created`)
      .setDescription(`Invite for **${guild.name}** created successfully.`)
      .addFields(
        { name: `${e.guild} Guild`, value: `${guild.name}\n\`${guild.id}\``, inline: true },
        { name: `${e.members} Members`, value: `\`${(guild.memberCount ?? 0).toLocaleString()}\``, inline: true },
        { name: `${e.link} Invite`, value: invite.url, inline: false },
      )
      .setFooter({ text: `Requested by ${author.tag}`, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Open Invite").setURL(invite.url).setStyle(ButtonStyle.Link).setEmoji(e.invite)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};

function findInviteChannel(guild) {
  const me = guild.members.me;
  const channels = guild.channels.cache
    .filter(channel =>
      [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildVoice, ChannelType.GuildStageVoice].includes(channel.type) &&
      channel.permissionsFor(me)?.has(PermissionFlagsBits.CreateInstantInvite)
    )
    .sort((a, b) => a.rawPosition - b.rawPosition);

  return guild.systemChannel && channels.has(guild.systemChannel.id)
    ? guild.systemChannel
    : channels.first();
}

function errorEmbed(message) {
  return new EmbedBuilder().setColor(0x4A3F5F).setTitle(`${e.error} Guild Invite Error`).setDescription(message);
}