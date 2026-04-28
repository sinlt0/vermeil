// ============================================================
//  commands/collection/resetclaim.js
//  $rc — reset your claim timer (Emerald badge I+ required)
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { fromConnection: UserStats } = require("../../models/collection/UserStats");
const { getActivePerks }            = require("../../utils/collection/badgeUtils");
const { resetClaimTimer, formatTimeRemaining } = require("../../utils/collection/cooldownUtils");

module.exports = {
  name: "rc", description: "Reset your claim timer. (Emerald badge required)",
  category: "collection", aliases: ["resetclaim"],
  usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    const guild   = message.guild;
    const userId  = message.author.id;

    const guildDb = await client.db.getGuildDb(guild.id);
    if (!guildDb || guildDb.isDown) return;

    const stats = await UserStats(guildDb.connection).findOne({ guildId: guild.id, userId }).lean();
    const perks = getActivePerks(stats);

    if (!perks.hasResetClaim) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription("❌ You need at least **Emerald Badge Level 1** to use `$rc`!\nUpgrade with `$badges buy emerald`.")] });
    }

    const result = await resetClaimTimer(guildDb.connection, guild.id, userId, perks.resetClaimCooldown);

    if (!result.success) {
      return message.reply({ embeds: [new EmbedBuilder()
        .setColor(0xFEE75C)
        .setDescription(`⏳ Reset claim is on cooldown! Available in **${result.display}**`)] });
    }

    return message.reply({ embeds: [new EmbedBuilder()
      .setColor(0x57F287)
      .setDescription(`✅ Claim timer reset! You can claim again now.\n*(Next reset available in **${formatTimeRemaining(perks.resetClaimCooldown * 60 * 60 * 1000)}**)*`)] });
  },
};
