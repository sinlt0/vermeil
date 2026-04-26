// ============================================================
//  commands/info/invite.js
//  Upgraded invite command
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
  description:      "Get the premium invite link for Vermeil.",
  category:         "info",
  aliases:          ["inv", "addbot"],
  usage:            "",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Get the premium invite link for Vermeil.")
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const inviteUrl = client.config?.inviteLink || `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.invite} Add Vermeil to your Server`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 512 }))
      .setDescription(
        `Expand your community with **Vermeil's** premium features. High-performance security, music, and management tools in one bot.\n\n` +
        `**Why invite us?**\n` +
        `${e.shield} **Ultimate Security:** Anti-Nuke & Verification.\n` +
        `${e.star} **Premium Features:** Advanced Leveling & Economy.\n` +
        `${e.support} **Dedicated Support:** 24/7 assistance.`
      )
      .addFields({ name: "🔗 Quick Stats", value: `Serving \`${client.guilds.cache.size.toLocaleString()}\` servers and \`${client.guilds.cache.reduce((a, b) => a + (b.memberCount || 0), 0).toLocaleString()}\` users.` })
      .setFooter({
        text: `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite Vermeil")
        .setURL(inviteUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.invite),
      new ButtonBuilder()
        .setLabel("Support")
        .setURL(client.config?.supportServer || "https://discord.gg")
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.support)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};