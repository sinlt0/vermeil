// ============================================================
//  commands/modmail/snippet.js
//  Manage and use quick reply snippets
//  Subcommands: add, remove, list, use
// ============================================================
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply }                            = require("../../utils/commandRunner");
const embeds                               = require("../../utils/embeds");
const { fromConnection: ModmailSnippet }   = require("../../models/ModmailSnippet");
const { fromConnection: ModmailThread }    = require("../../models/ModmailThread");
const { relayToUser, COLORS }              = require("../../utils/modmailUtils");

module.exports = {
  name:             "mmsnippet",
  description:      "Manage and use modmail snippets.",
  category:         "modmail",
  aliases:          ["mmsnip", "mmtemplate"],
  usage:            "<add|remove|list|use> [name] [content]",
  cooldown:         3,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("mmsnippet")
    .setDescription("Manage and use modmail snippets.")
    .addSubcommand(sub => sub.setName("add")
      .setDescription("Add a new snippet.")
      .addStringOption(o => o.setName("name").setDescription("Snippet name.").setRequired(true).setMaxLength(50))
      .addStringOption(o => o.setName("content").setDescription("Snippet content.").setRequired(true).setMaxLength(2000))
    )
    .addSubcommand(sub => sub.setName("remove")
      .setDescription("Remove a snippet.")
      .addStringOption(o => o.setName("name").setDescription("Snippet name.").setRequired(true))
    )
    .addSubcommand(sub => sub.setName("list").setDescription("List all snippets."))
    .addSubcommand(sub => sub.setName("use")
      .setDescription("Use a snippet as a reply.")
      .addStringOption(o => o.setName("name").setDescription("Snippet name.").setRequired(true))
    )
    .toJSON(),

  async execute(client, ctx) {
    const channel = ctx.type === "prefix" ? ctx.message.channel : ctx.interaction.channel;
    const guild   = ctx.type === "prefix" ? ctx.message.guild   : ctx.interaction.guild;
    const staff   = ctx.type === "prefix" ? ctx.message.member  : ctx.interaction.member;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const ModmailSnippetModel = ModmailSnippet(guildDb.connection);

    let sub, name, content;
    if (ctx.type === "prefix") {
      sub     = ctx.args[0]?.toLowerCase();
      name    = ctx.args[1]?.toLowerCase();
      content = ctx.args.slice(2).join(" ");
    } else {
      sub     = ctx.interaction.options.getSubcommand();
      name    = ctx.interaction.options.getString("name")?.toLowerCase();
      content = ctx.interaction.options.getString("content");
    }

    // ADD
    if (sub === "add") {
      if (!name || !content) return reply(ctx, { embeds: [embeds.error("Please provide a name and content.")] });
      const existing = await ModmailSnippetModel.findOne({ guildId: guild.id, name });
      if (existing) return reply(ctx, { embeds: [embeds.error(`Snippet \`${name}\` already exists.`)] });

      await ModmailSnippetModel.create({ guildId: guild.id, name, content, createdBy: staff.id });
      return reply(ctx, { embeds: [embeds.success(`Snippet \`${name}\` created.\n**Preview:** ${content}`, "✅ Snippet Added")] });
    }

    // REMOVE
    if (sub === "remove") {
      if (!name) return reply(ctx, { embeds: [embeds.error("Please provide a snippet name.")] });
      const deleted = await ModmailSnippetModel.findOneAndDelete({ guildId: guild.id, name });
      if (!deleted) return reply(ctx, { embeds: [embeds.error(`Snippet \`${name}\` not found.`)] });
      return reply(ctx, { embeds: [embeds.success(`Snippet \`${name}\` deleted.`, "✅ Snippet Removed")] });
    }

    // LIST
    if (sub === "list") {
      const snippets = await ModmailSnippetModel.find({ guildId: guild.id });
      if (snippets.length === 0) return reply(ctx, { embeds: [embeds.info("No snippets configured.")] });

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle("📝 Modmail Snippets")
        .setDescription(snippets.map(s => `\`${s.name}\` — ${s.content.substring(0, 60)}${s.content.length > 60 ? "..." : ""}`).join("\n"))
        .setFooter({ text: `${snippets.length} snippet(s)` })
        .setTimestamp();
      return reply(ctx, { embeds: [embed] });
    }

    // USE
    if (sub === "use") {
      if (!name) return reply(ctx, { embeds: [embeds.error("Please provide a snippet name.")] });

      const snippet = await ModmailSnippetModel.findOne({ guildId: guild.id, name });
      if (!snippet) return reply(ctx, { embeds: [embeds.error(`Snippet \`${name}\` not found.`)] });

      const ModmailThreadModel = ModmailThread(guildDb.connection);
      const thread = await ModmailThreadModel.findOne({ channelId: channel.id, status: { $ne: "closed" } });
      if (!thread) return reply(ctx, { embeds: [embeds.error("This is not an active modmail thread.")] });

      const user = await client.users.fetch(thread.userId).catch(() => null);
      if (!user) return reply(ctx, { embeds: [embeds.error("Could not find the user.")] });

      await relayToUser(client, user, guild, snippet.content, staff, false);

      const threadEmbed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setAuthor({ name: `${staff.user.tag} [snippet: ${name}]`, iconURL: staff.user.displayAvatarURL({ dynamic: true }) })
        .setDescription(snippet.content)
        .setFooter({ text: `Staff Reply via Snippet • ${staff.user.id}` })
        .setTimestamp();

      await channel.send({ embeds: [threadEmbed] });

      if (ctx.type === "prefix") await ctx.message.delete().catch(() => {});
      else await ctx.interaction.reply({ content: "✅ Snippet sent.", ephemeral: true });
    }
  },
};
