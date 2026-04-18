const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/utilityemoji");

module.exports = {
  name:             "avatar",
  description:      "View a user's avatar.",
  category:         "utility",
  aliases:          ["av", "pfp"],
  usage:            "[@user|userID]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("View a user's avatar.")
    .addUserOption(o =>
      o.setName("user")
        .setDescription("User to view.")
        .setRequired(false)
    )
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    let user = author;

    if (ctx.type === "prefix") {
      const mention = ctx.message.mentions.users.first();
      const id = ctx.args[0]?.replace(/[<@!>]/g, "");
      if (mention) user = mention;
      else if (id && /^\d{17,20}$/.test(id)) user = await client.users.fetch(id).catch(() => null);
    } else {
      user = ctx.interaction.options.getUser("user") ?? author;
    }

    if (!user) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle(`${e.warning} User Not Found`)
            .setDescription("Please provide a valid user mention or ID."),
        ],
      });
    }

    const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 1024 });
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${e.avatar} ${user.tag}'s Avatar`)
      .setImage(avatarUrl)
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Avatar")
        .setURL(avatarUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.link)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};