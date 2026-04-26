const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchSocial } = require("../../utils/socialApiUtils");
const e = require("../../emojis/socialemoji");

const ACTIONS = {
  hug:      { label: "hugged",     emoji: e.hug,      target: true },
  kiss:     { label: "kissed",     emoji: e.kiss,     target: true },
  pat:      { label: "patted",     emoji: e.pat,      target: true },
  slap:     { label: "slapped",    emoji: e.slap,     target: true },
  cuddle:   { label: "cuddled",    emoji: e.cuddle,   target: true },
  poke:     { label: "poked",      emoji: e.poke,     target: true },
  tickle:   { label: "tickled",    emoji: e.tickle,   target: true },
  highfive: { label: "high-fived", emoji: e.highfive, target: true },
  lick:     { label: "licked",     emoji: e.lick,     target: true },
  bite:     { label: "bit",        emoji: e.bite,     target: true },
  nom:      { label: "is nomming on", emoji: e.nom,   target: true },
  kill:     { label: "killed",     emoji: e.kill,     target: true },
  wave:     { label: "waved at",   emoji: e.wave,     target: true },
  smile:    { label: "smiled at",  emoji: e.smile,    target: true },
  dance:    { label: "is dancing", emoji: e.dance,    target: false },
  smug:     { label: "is smug",    emoji: e.smug,     target: false },
  blush:    { label: "is blushing", emoji: e.blush,   target: false },
};

module.exports = {
  name:             "social",
  description:      "Master social interaction command.",
  category:         "social",
  usage:            "/social <action> [user]",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("social")
    .setDescription("Social interactions with users.")
    .addSubcommand(s => s.setName("hug").setDescription("Hug someone.").addUserOption(o => o.setName("user").setDescription("User to hug").setRequired(true)))
    .addSubcommand(s => s.setName("kiss").setDescription("Kiss someone.").addUserOption(o => o.setName("user").setDescription("User to kiss").setRequired(true)))
    .addSubcommand(s => s.setName("pat").setDescription("Pat someone.").addUserOption(o => o.setName("user").setDescription("User to pat").setRequired(true)))
    .addSubcommand(s => s.setName("slap").setDescription("Slap someone.").addUserOption(o => o.setName("user").setDescription("User to slap").setRequired(true)))
    .addSubcommand(s => s.setName("cuddle").setDescription("Cuddle someone.").addUserOption(o => o.setName("user").setDescription("User to cuddle").setRequired(true)))
    .addSubcommand(s => s.setName("poke").setDescription("Poke someone.").addUserOption(o => o.setName("user").setDescription("User to poke").setRequired(true)))
    .addSubcommand(s => s.setName("tickle").setDescription("Tickle someone.").addUserOption(o => o.setName("user").setDescription("User to tickle").setRequired(true)))
    .addSubcommand(s => s.setName("highfive").setDescription("Highfive someone.").addUserOption(o => o.setName("user").setDescription("User to highfive").setRequired(true)))
    .addSubcommand(s => s.setName("lick").setDescription("Lick someone.").addUserOption(o => o.setName("user").setDescription("User to lick").setRequired(true)))
    .addSubcommand(s => s.setName("bite").setDescription("Bite someone.").addUserOption(o => o.setName("user").setDescription("User to bite").setRequired(true)))
    .addSubcommand(s => s.setName("nom").setDescription("Nom someone.").addUserOption(o => o.setName("user").setDescription("User to nom").setRequired(true)))
    .addSubcommand(s => s.setName("kill").setDescription("Kill someone.").addUserOption(o => o.setName("user").setDescription("User to kill").setRequired(true)))
    .addSubcommand(s => s.setName("wave").setDescription("Wave to someone.").addUserOption(o => o.setName("user").setDescription("User to wave at").setRequired(true)))
    .addSubcommand(s => s.setName("smile").setDescription("Smile at someone.").addUserOption(o => o.setName("user").setDescription("User to smile at").setRequired(true)))
    .addSubcommand(s => s.setName("dance").setDescription("Dance!"))
    .addSubcommand(s => s.setName("blush").setDescription("Blush!"))
    .addSubcommand(s => s.setName("smug").setDescription("Be smug!"))
    .toJSON(),

  async execute(client, ctx) {
    const action = ctx.interaction.options.getSubcommand();
    const config = ACTIONS[action];
    const author = ctx.interaction.user;
    const target = ctx.interaction.options.getUser("user");

    let description = "";
    if (config.target) {
      if (!target) return reply(ctx, { content: `Please mention a user!` });
      if (target.id === author.id) return reply(ctx, { content: `You can't do that to yourself!` });
      description = `**${author.username}** ${config.label} **${target.username}**! ${config.emoji}`;
    } else {
      description = `**${author.username}** ${config.label}! ${config.emoji}`;
    }

    try {
      const { url, provider } = await fetchSocial(action);
      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setDescription(description)
        .setImage(url)
        .setFooter({ text: `Source: ${provider}` });
      
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: `Failed to fetch animation.` });
    }
  },
};