const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const e = require("../../emojis/utilityemoji");

module.exports = {
  name:             "choose",
  description:      "Let the bot choose from a list of options.",
  category:         "utility",
  aliases:          ["pick"],
  usage:            "<option 1>, <option 2>, <option 3>",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: false,
  slash: false,

  slashData: new SlashCommandBuilder()
    .setName("choose")
    .setDescription("Let the bot choose from a list of options.")
    .addStringOption(o =>
      o.setName("options")
        .setDescription("Separate options with commas or | symbols.")
        .setRequired(true)
    )
    .toJSON(),

  async execute(client, ctx) {
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const input = ctx.type === "prefix"
      ? ctx.args.join(" ")
      : ctx.interaction.options.getString("options");
    const options = input
      .split(/[,|]/)
      .map(option => option.trim())
      .filter(Boolean)
      .slice(0, 25);

    if (options.length < 2) {
      return reply(ctx, {
        embeds: [
          new EmbedBuilder()
            .setColor(0x4A3F5F)
            .setTitle(`${e.warning} Not Enough Options`)
            .setDescription("Please provide at least two options separated by commas or `|`."),
        ],
      });
    }

    const selected = options[Math.floor(Math.random() * options.length)];
    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${e.choose} I Choose...`)
      .setDescription(`**${selected}**`)
      .addFields({
        name: `${e.dice} Options`,
        value: options.map((option, index) => `\`${index + 1}.\` ${option}`).join("\n").slice(0, 1024),
      })
      .setFooter({
        text:    `Requested by ${author.tag}`,
        iconURL: author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};