const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");

module.exports = {
  name: "gift",
  description: "Gift a character to another user.",
  category: "collection",
  aliases: ["give"],
  usage: "<@user> <character name or ID>",
  cooldown: 5,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    const targetUser = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    const query = ctx.type === "prefix" ? ctx.args.slice(1).join(" ") : ctx.interaction.options.getString("character");

    if (!targetUser || !query) return reply(ctx, { content: "Usage: `!gift @user <character>`" });
    if (targetUser.id === ctx.author.id) return reply(ctx, { content: "You can't gift to yourself!" });
    if (targetUser.bot) return reply(ctx, { content: "You can't gift to bots!" });

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ClaimModel = CharacterClaim(guildDb.connection);
    
    const search = isNaN(query) ? { guildId: ctx.guild.id, userId: ctx.author.id, characterName: new RegExp(query, "i") } : { guildId: ctx.guild.id, userId: ctx.author.id, characterId: parseInt(query) };
    const claim = await ClaimModel.findOne(search);

    if (!claim) return reply(ctx, { content: "❌ You don't own this character!" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("confirm").setLabel("Confirm Gift").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🎁 Gift Character")
      .setDescription(`Are you sure you want to gift **${claim.characterName}** to **${targetUser.username}**?`);

    const msg = await (ctx.type === "prefix" ? ctx.message.reply({ embeds: [embed], components: [row] }) : ctx.interaction.reply({ embeds: [embed], components: [row], withResponse: true }));
    const targetMsg = ctx.type === "prefix" ? msg : msg.resource.message;

    const collector = targetMsg.createMessageComponentCollector({ time: 30000, max: 1 });

    collector.on("collect", async i => {
      if (i.user.id !== ctx.author.id) return i.reply({ content: "Not your menu!", ephemeral: true });

      if (i.customId === "confirm") {
        claim.userId = targetUser.id;
        await claim.save();
        await i.update({ content: `🎁 **${ctx.author.username}** has gifted **${claim.characterName}** to **${targetUser.username}**!`, embeds: [], components: [] });
      } else {
        await i.update({ content: "Gift cancelled.", embeds: [], components: [] });
      }
    });
  },
};