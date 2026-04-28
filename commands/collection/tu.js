// ============================================================
//  commands/collection/tu.js
//  $tu — view all your cooldown timers
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { getAllTimers }  = require("../../utils/collection/cooldownUtils");
const { fromConnection: CollectionConfig } = require("../../models/collection/CollectionConfig");

module.exports = {
  name: "tu", description: "View your cooldown timers.",
  category: "collection", aliases: ["timers","t"],
  usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const config = await CollectionConfig(guildDb.connection).findOne({ guildId: guild.id }).lean();
    const timers = await getAllTimers(guildDb.connection, guild.id, userId, config ?? {});

    const embed = new EmbedBuilder()
      .setColor(0x9B59B6)
      .setTitle(`⏱️ Timers — ${message.author.username}`)
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        {
          name:  timers.claim.ready ? "✅ Claim" : "⏳ Claim",
          value: timers.claim.ready ? "**Ready!**" : `Ready in **${timers.claim.display}**`,
          inline: true,
        },
        {
          name:  timers.rolls.ready ? "✅ Rolls" : "⏳ Rolls",
          value: timers.rolls.ready
            ? `**${timers.rolls.left}** rolls available`
            : `**${timers.rolls.left}** left — resets in **${timers.rolls.display}**`,
          inline: true,
        },
        {
          name:  timers.daily.ready ? "✅ Daily" : "⏳ Daily",
          value: timers.daily.ready ? "**Ready!** Use `$dk`" : `Ready in **${timers.daily.display}**`,
          inline: true,
        },
      )
      .setFooter({ text: `${config?.rollsPerReset ?? 10} rolls per ${config?.rollResetMinutes ?? 60}min • Claim cooldown: ${config?.claimCooldownHrs ?? 3}h` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
