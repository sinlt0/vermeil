const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const { fromConnection: CharacterClaim } = require("../../models/collector/CharacterClaim");

module.exports = {
  name: "trade",
  description: "Trade a character with another user.",
  category: "collection",
  aliases: ["exchange"],
  usage: "<@user> <your character> | <their character>",
  cooldown: 10,
  requiresDatabase: true,
  slash: false,

  async execute(client, ctx) {
    // Simple trade implementation: Trade 1 for 1
    // Format: !trade @user MyCharName | TheirCharName
    const targetUser = ctx.type === "prefix" ? ctx.message.mentions.users.first() : ctx.interaction.options.getUser("user");
    if (!targetUser || targetUser.id === ctx.author.id) return reply(ctx, { content: "Mention someone to trade with!" });

    const content = ctx.type === "prefix" ? ctx.args.slice(1).join(" ") : ctx.interaction.options.getString("details");
    if (!content || !content.includes("|")) return reply(ctx, { content: "Format: `!trade @user Your Character | Their Character`" });

    const [myQuery, theirQuery] = content.split("|").map(s => s.trim());

    const guildDb = await client.db.getGuildDb(ctx.guild.id);
    const ClaimModel = CharacterClaim(guildDb.connection);

    const myClaim = await ClaimModel.findOne({ guildId: ctx.guild.id, userId: ctx.author.id, characterName: new RegExp(myQuery, "i") });
    const theirClaim = await ClaimModel.findOne({ guildId: ctx.guild.id, userId: targetUser.id, characterName: new RegExp(theirQuery, "i") });

    if (!myClaim) return reply(ctx, { content: `❌ You don't own **${myQuery}**!` });
    if (!theirClaim) return reply(ctx, { content: `❌ **${targetUser.username}** doesn't own **${theirQuery}**!` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept").setLabel("Accept Trade").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle("🤝 Character Trade Proposal")
      .setDescription(`**${ctx.author.username}** wants to trade:\n**${myClaim.characterName}**\n\nFor **${targetUser.username}'s**:\n**${theirClaim.characterName}**\n\n<@${targetUser.id}>, do you accept?`);

    const msg = await (ctx.type === "prefix" ? ctx.message.reply({ content: `<@${targetUser.id}>`, embeds: [embed], components: [row] }) : ctx.interaction.reply({ content: `<@${targetUser.id}>`, embeds: [embed], components: [row], withResponse: true }));
    const targetMsg = ctx.type === "prefix" ? msg : msg.resource.message;

    const collector = targetMsg.createMessageComponentCollector({ time: 60000, max: 1 });

    collector.on("collect", async i => {
      if (i.user.id !== targetUser.id) return i.reply({ content: "Only the recipient can accept this trade!", ephemeral: true });

      if (i.customId === "accept") {
        // Swap IDs
        myClaim.userId = targetUser.id;
        theirClaim.userId = ctx.author.id;
        await Promise.all([myClaim.save(), theirClaim.save()]);

        await i.update({ content: `✅ **Trade Complete!** Swapped **${myClaim.characterName}** and **${theirClaim.characterName}**.`, embeds: [], components: [] });
      } else {
        await i.update({ content: "❌ Trade declined.", embeds: [], components: [] });
      }
    });
  },
};