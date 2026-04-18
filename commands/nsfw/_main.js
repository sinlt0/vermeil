const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fetchNsfw } = require("../../utils/nsfwApiUtils");
const e = require("../../emojis/nsfwemoji");

const ACTIONS = {
  hentai:   { title: "Hentai",   emoji: e.hentai, type: "image" },
  neko:     { title: "Neko",     emoji: e.neko,   type: "image" },
  waifu:    { title: "Waifu",    emoji: e.waifu,  type: "image" },
  ero:      { title: "Ero",      emoji: e.ero,    type: "image" },
  lesbian:  { title: "Lesbian",  emoji: "👭",     type: "image" },
  thighs:   { title: "Thighs",   emoji: "🍗",     type: "image" },
  panties:  { title: "Panties",  emoji: "👙",     type: "image" },
  solo:     { title: "Solo",     emoji: e.solo,   type: "image" },
  yuri:     { title: "Yuri",     emoji: "👭",     type: "image" },
  ass:      { title: "Ass",      emoji: e.ass,    type: "dual" },
  boobs:    { title: "Boobs",    emoji: e.boobs,  type: "dual" },
  pussy:    { title: "Pussy",    emoji: "🍑",     type: "dual" },
  spank:    { title: "Spanked!", emoji: e.spank,  type: "interaction", label: "spanked" },
  bj:       { title: "Blowjob!", emoji: e.bj,     type: "interaction", label: "is giving a blowjob to" },
  cum:      { title: "Cum!",     emoji: e.cum,    type: "interaction", label: "cummed on" },
  fuck:     { title: "Fucked!",  emoji: "👉",     type: "interaction", label: "is fucking" },
  anal:     { title: "Anal!",    emoji: "🍑",     type: "interaction", label: "is going anal on" },
};

module.exports = {
  name:             "nsfw",
  description:      "Master NSFW interaction command.",
  category:         "nsfw",
  usage:            "/nsfw <action> [user/type]",
  cooldown:         3,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("nsfw")
    .setDescription("NSFW interactions and images.")
    .addSubcommand(s => s.setName("hentai").setDescription("Get random hentai image."))
    .addSubcommand(s => s.setName("neko").setDescription("Get random NSFW neko image."))
    .addSubcommand(s => s.setName("waifu").setDescription("Get random NSFW waifu image."))
    .addSubcommand(s => s.setName("ero").setDescription("Get random NSFW ero image."))
    .addSubcommand(s => s.setName("lesbian").setDescription("Get random lesbian content."))
    .addSubcommand(s => s.setName("thighs").setDescription("Get random anime thighs."))
    .addSubcommand(s => s.setName("panties").setDescription("Get random anime panties."))
    .addSubcommand(s => s.setName("solo").setDescription("Get random NSFW solo content."))
    .addSubcommand(s => s.setName("yuri").setDescription("Get random NSFW yuri content."))
    .addSubcommand(s => s.setName("ass").setDescription("Get random ass images.").addStringOption(o => o.setName("type").setDescription("Anime or IRL?").addChoices({ name: "Anime", value: "anime" }, { name: "IRL", value: "irl" })))
    .addSubcommand(s => s.setName("boobs").setDescription("Get random boobs images.").addStringOption(o => o.setName("type").setDescription("Anime or IRL?").addChoices({ name: "Anime", value: "anime" }, { name: "IRL", value: "irl" })))
    .addSubcommand(s => s.setName("pussy").setDescription("Get random pussy images.").addStringOption(o => o.setName("type").setDescription("Anime or IRL?").addChoices({ name: "Anime", value: "anime" }, { name: "IRL", value: "irl" })))
    .addSubcommand(s => s.setName("spank").setDescription("Spank someone.").addUserOption(o => o.setName("user").setDescription("User to spank").setRequired(true)))
    .addSubcommand(s => s.setName("bj").setDescription("Give someone a BJ.").addUserOption(o => o.setName("user").setDescription("User to target").setRequired(true)))
    .addSubcommand(s => s.setName("cum").setDescription("Cum on someone.").addUserOption(o => o.setName("user").setDescription("User to target").setRequired(true)))
    .addSubcommand(s => s.setName("fuck").setDescription("Fuck someone.").addUserOption(o => o.setName("user").setDescription("User to target").setRequired(true)))
    .addSubcommand(s => s.setName("anal").setDescription("Go anal on someone.").addUserOption(o => o.setName("user").setDescription("User to target").setRequired(true)))
    .toJSON(),

  async execute(client, ctx) {
    if (!ctx.interaction.channel.nsfw) {
      return reply(ctx, { content: `${e.warning} This command can only be used in NSFW channels!`, ephemeral: true });
    }

    const action = ctx.interaction.options.getSubcommand();
    const config = ACTIONS[action];
    const author = ctx.interaction.user;
    
    let targetType = action;
    let description = "";

    if (config.type === "interaction") {
      const target = ctx.interaction.options.getUser("user");
      if (target.id === author.id) return reply(ctx, { content: "You can't do that to yourself!" });
      description = `**${author.username}** ${config.label} **${target.username}**! ${config.emoji}`;
    } else if (config.type === "dual") {
      const mode = ctx.interaction.options.getString("type") || "anime";
      if (mode === "irl") targetType = `${action}_irl`;
    }

    try {
      const { url, provider } = await fetchNsfw(targetType);
      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setAuthor({ name: `Vermeil NSFW`, iconURL: client.user.displayAvatarURL() })
        .setTitle(`${config.emoji} Random ${action.toUpperCase()}`)
        .setImage(url)
        .setFooter({ text: `Source: ${provider.replace('_', ' ')}` })
        .setTimestamp();

      if (description) embed.setDescription(description);
      return reply(ctx, { embeds: [embed] });
    } catch (err) {
      return reply(ctx, { content: `Failed to fetch content. Please try again later.` });
    }
  },
};