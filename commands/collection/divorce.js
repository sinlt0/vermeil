const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");
const e = require("../../emojis/collectionemoji");

module.exports = {
  name: "divorce",
  description: "Remove a character from your collection.",
  category: "collection",
  aliases: ["div"],
  usage: "<characterName or ID>",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const author = ctx.type === "prefix" ? ctx.message.author : ctx.interaction.user;
    const query = ctx.type === "prefix" ? ctx.args.join(" ") : ctx.interaction.options.getString("character");

    if (!query) return reply(ctx, { content: "Please provide a character name or ID to divorce." });

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const ClaimModel = CharacterClaim(guildDb.connection);
    
    // Search by ID or Name
    const search = isNaN(query) ? { guildId: guild.id, userId: author.id, characterName: new RegExp(query, "i") } : { guildId: guild.id, userId: author.id, characterId: parseInt(query) };
    const claim = await ClaimModel.findOne(search);

    if (!claim) return reply(ctx, { content: "❌ You don't own this character!" });

    // Confirmation row
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm").setLabel("Confirm Divorce").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("Divorce Confirmation")
      .setDescription(`Are you sure you want to divorce **${claim.characterName}**?\nYou will no longer own this character.`);

    const msg = await (ctx.type === "prefix" ? ctx.message.reply({ embeds: [embed], components: [row] }) : ctx.interaction.reply({ embeds: [embed], components: [row], withResponse: true }));
    const targetMsg = ctx.type === "prefix" ? msg : msg.resource.message;

    const collector = targetMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 30000, max: 1 });

    collector.on("collect", async i => {
      if (i.user.id !== author.id) return i.reply({ content: "Not your menu!", ephemeral: true });

      if (i.customId === "confirm") {
        await ClaimModel.deleteOne({ _id: claim._id });
        await i.update({ content: `💔 You have divorced **${claim.characterName}**.`, embeds: [], components: [] });
      } else {
        await i.update({ content: "Divorce cancelled.", embeds: [], components: [] });
      }
    });
  },
};