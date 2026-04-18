// ============================================================
//  commands/info/invite.js
//  Sends the bot invite link
// ============================================================
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/infoemoji");

module.exports = {
  name:             "invite",
  description:      "Get the bot invite link.",
  category:         "info",
  aliases:          ["inv"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Get the bot invite link.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(0x7d5ba6)
      .setTitle(`${e.invite} Invite ${client.user.username}`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        `Click the button below to add **${client.user.username}** to your server.\n\n` +
        `${e.shield} **Permissions:** Administrator\n` +
        `${e.server} **Servers:** \`${client.guilds.cache.size.toLocaleString()}\`\n` +
        `${e.command} **Slash Commands:** Supported`
      )
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite Bot")
        .setURL(inviteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.invite)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};