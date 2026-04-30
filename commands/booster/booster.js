const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { reply } = require("../../utils/commandRunner");
const embeds = require("../../utils/embeds");
const { fromConnection: BoosterMember } = require("../../models/BoosterMember");

module.exports = {
  name: "booster",
  description: "Check your boost status and count.",
  category: "booster",
  aliases: ["booststats"],
  usage: "/booster [user]",
  cooldown: 5,
  requiresDatabase: true,
  slash: true,

  slashData: new SlashCommandBuilder()
    .setName("booster")
    .setDescription("Check yours or another member's boost status.")
    .addUserOption(o => o.setName("user").setDescription("The user to check").setRequired(false))
    .toJSON(),

  async execute(client, ctx) {
    const guild = ctx.type === "prefix" ? ctx.message.guild : ctx.interaction.guild;
    const target = ctx.type === "prefix" 
      ? (ctx.message.mentions.members.first() || ctx.message.member) 
      : (ctx.interaction.options.getMember("user") || ctx.interaction.member);

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return reply(ctx, { embeds: [embeds.clusterDown(guildDb?.clusterName)] });

    const MemberModel = BoosterMember(guildDb.connection);
    const data = await MemberModel.findOne({ guildId: guild.id, userId: target.id });

    const isBoosting = !!target.premiumSince;
    const boostCount = data ? data.boostCount : (isBoosting ? 1 : 0);

    const embed = new EmbedBuilder()
      .setAuthor({ name: target.user.tag, iconURL: target.user.displayAvatarURL() })
      .setTitle("💎 Booster Status")
      .setColor(isBoosting ? 0xF47FFF : 0x99AAB5)
      .addFields(
        { name: "Status", value: isBoosting ? `Boosting since <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:R>` : "Not currently boosting", inline: true },
        { name: "Total Boosts", value: `\`${boostCount}\` boosts`, inline: true }
      )
      .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return reply(ctx, { embeds: [embed] });
  },
};
