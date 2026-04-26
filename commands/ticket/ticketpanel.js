// ============================================================
//  commands/ticket/ticketpanel.js
//  Create and send ticket panels with category dropdowns
// ============================================================
const {
  SlashCommandBuilder, PermissionFlagsBits,
  EmbedBuilder, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ChannelType,
} = require("discord.js");
const { reply }                          = require("../../utils/commandRunner");
const embeds                             = require("../../utils/embeds");
const { fromConnection: TicketCategory } = require("../../models/TicketCategory");
const { fromConnection: TicketPanel }    = require("../../models/TicketPanel");

module.exports = {
  name:             "ticketpanel",
  description:      "Create and send a ticket panel.",
  category:         "ticket",
  aliases:          ["tpanel"],
  usage:            "<send> [#channel] [title] [description]",
  cooldown:         5,
  ownerOnly:        false,
  devOnly:          false,
  requiresDatabase: true,
  slash:            true,

  slashData: new SlashCommandBuilder()
    .setName("ticketpanel")
    .setDescription("Create and send a ticket panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub => sub.setName("send")
      .setDescription("Send a ticket panel to a channel.")
      .addChannelOption(o => o.setName("channel").setDescription("Channel to send panel to.").addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addStringOption(o => o.setName("title").setDescription("Panel title.").setRequired(false).setMaxLength(256))
      .addStringOption(o => o.setName("description").setDescription("Panel description.").setRequired(false).setMaxLength(4000))
      .addStringOption(o => o.setName("color").setDescription("Panel embed color hex.").setRequired(false))
    )
    .addSubcommand(sub => sub.setName("list").setDescription("List all ticket panels."))
    .addSubcommand(sub => sub.setName("delete")
      .setDescription("Delete a ticket panel.")
      .addStringOption(o => o.setName("messageid").setDescription("Message ID of the panel to delete.").setRequired(true))
    )
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const mod   = ctx.type === "prefix" ? ctx.message.member : ctx.interaction.member;

    if (!mod.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return reply(ctx, { embeds: [embeds.error("You need the **Manage Server** permission.")] });
    }

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const TicketCategoryModel = TicketCategory(guildDb.connection);
    const TicketPanelModel    = TicketPanel(guildDb.connection);

    let sub;
    if (ctx.type === "prefix") {
      sub = ctx.args[0]?.toLowerCase();
    } else {
      sub = ctx.interaction.options.getSubcommand();
    }

    // SEND
    if (sub === "send") {
      const categories = await TicketCategoryModel.find({ guildId: guild.id });
      if (categories.length === 0) {
        return reply(ctx, { embeds: [embeds.error("No ticket categories configured. Use `ticketcategory add` first.")] });
      }

      let channel, title, description, color;
      if (ctx.type === "prefix") {
        channel     = ctx.message.mentions.channels.first();
        title       = ctx.args[2] ?? "Support Tickets";
        description = ctx.args.slice(3).join(" ") || "Select a category below to open a support ticket.";
        color       = "#5865F2";
      } else {
        channel     = ctx.interaction.options.getChannel("channel");
        title       = ctx.interaction.options.getString("title") ?? "Support Tickets";
        description = ctx.interaction.options.getString("description") ?? "Select a category below to open a support ticket.";
        color       = ctx.interaction.options.getString("color") ?? "#5865F2";
      }

      if (!channel) return reply(ctx, { embeds: [embeds.error("Please provide a channel.")] });

      const colorInt = parseInt(color.replace("#", ""), 16) || 0x5865F2;

      const panelEmbed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle(`🎫 ${title}`)
        .setDescription(description)
        .addFields({
          name:  "📂 Categories",
          value: categories.map(c => `${c.emoji} **${c.name}**${c.description ? ` — ${c.description}` : ""}`).join("\n"),
        })
        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) ?? undefined })
        .setTimestamp();

      // Build dropdown
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`ticket_panel_select`)
        .setPlaceholder("📂 Select a category to open a ticket...")
        .addOptions(
          categories.map(c =>
            new StringSelectMenuOptionBuilder()
              .setLabel(c.name)
              .setDescription(c.description ?? `Open a ${c.name} ticket`)
              .setValue(c._id.toString())
              .setEmoji(c.emoji ?? "🎫")
          )
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const panelMsg = await channel.send({ embeds: [panelEmbed], components: [row] });

      // Save panel
      await TicketPanelModel.create({
        guildId:     guild.id,
        channelId:   channel.id,
        messageId:   panelMsg.id,
        title,
        description,
        color,
        categories:  categories.map(c => c._id.toString()),
      });

      return reply(ctx, { embeds: [embeds.success(`Ticket panel sent to ${channel}!`, "✅ Panel Sent")] });
    }

    // LIST
    if (sub === "list") {
      const panels = await TicketPanelModel.find({ guildId: guild.id });
      if (panels.length === 0) return reply(ctx, { embeds: [embeds.info("No panels found. Use `ticketpanel send` to create one.")] });

      const embed = new EmbedBuilder()
        .setColor(0x4A3F5F)
        .setTitle("🎫 Ticket Panels")
        .setDescription(panels.map(p =>
          `**${p.title}**\n┣ Channel: <#${p.channelId}>\n┣ Message ID: \`${p.messageId}\`\n┗ Categories: ${p.categories.length}`
        ).join("\n\n"))
        .setTimestamp();

      return reply(ctx, { embeds: [embed] });
    }

    // DELETE
    if (sub === "delete") {
      const messageId = ctx.type === "prefix" ? ctx.args[1] : ctx.interaction.options.getString("messageid");
      if (!messageId) return reply(ctx, { embeds: [embeds.error("Please provide a message ID.")] });

      const panel = await TicketPanelModel.findOne({ guildId: guild.id, messageId });
      if (!panel) return reply(ctx, { embeds: [embeds.error("Panel not found.")] });

      // Try to delete the message
      const panelChannel = guild.channels.cache.get(panel.channelId);
      if (panelChannel) {
        const panelMsg = await panelChannel.messages.fetch(panel.messageId).catch(() => null);
        if (panelMsg) await panelMsg.delete().catch(() => {});
      }

      await TicketPanelModel.deleteOne({ messageId });
      return reply(ctx, { embeds: [embeds.success("Panel deleted.", "✅ Panel Deleted")] });
    }

    return reply(ctx, { embeds: [embeds.error("Invalid subcommand. Use: `send`, `list`, `delete`.")] });
  },
};
