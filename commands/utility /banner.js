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
  name:             "banner",
  description:      "View a user's banner.",
  category:         "utility",
  aliases:          ["userbanner", "ubanner"],
  usage:            "[@user|userID]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("banner")
    .setDescription("View a user's banner.")
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
            .setColor(0x4A3F5F)
            .setTitle(`${e.warning} User Not Found`)
            .setDescription("Please provide a valid user mention or ID."),
        ],
      });
    }

    const fullUser = await client.users.fetch(user.id, { force: true }).catch(() => user);
    const bannerUrl = fullUser.bannerURL({ dynamic: true, size: 1024 });

    if (!bannerUrl) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x4A3F5F)
            .setTitle(`${e.warning} No Banner Found`)
            .setDescription(`**${user.tag}** does not have a banner.`),
        ],
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.banner} ${user.tag}'s Banner`)
      .setImage(bannerUrl)
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Open Banner")
        .setURL(bannerUrl)
        .setStyle(ButtonStyle.Link)
        .setEmoji(e.link)
    );

    return reply(ctx, { embeds: [embed], components: [row] });
  },
};