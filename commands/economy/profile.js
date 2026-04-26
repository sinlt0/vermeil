// ============================================================
//  commands/economy/profile.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { getProfile, formatNum } = require("../../utils/ecoUtils");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "profile", description: "View your economy profile.", category: "economy",
  aliases: ["p", "me"], usage: "[@user]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const target  = message.mentions.users.first() ?? message.author;
    const profile = await getProfile(client, target.id);

    if (!profile?.agreedToTos) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F).setDescription(`${eco.error} **${target.username}** hasn't started the economy yet!`)] });
    }

    const Job = client.ecoDb.getModel("Job");
    const job = await Job.findOne({ userId: target.id }).lean();

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setAuthor({ name: `${target.username}'s Profile`, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: `${eco.wallet} Wallet`,   value: `${eco.coin} ${formatNum(profile.wallet)}`,       inline: true },
        { name: `${eco.bank} Bank`,       value: `${eco.coin} ${formatNum(profile.bank)}`,         inline: true },
        { name: `${eco.gem} Gems`,        value: `${eco.gem} ${formatNum(profile.gems)}`,          inline: true },
        { name: `${eco.level} Level`,     value: `${profile.level}`,                               inline: true },
        { name: `${eco.xp} XP`,          value: `${formatNum(profile.xp)}`,                       inline: true },
        { name: `${eco.prestige} Prestige`,value: `${profile.prestige}`,                           inline: true },
        { name: `${eco.job} Job`,         value: job?.jobName ? `${job.jobName} (Lv.${job.jobLevel})` : "Unemployed", inline: true },
        { name: `${eco.work} Works`,      value: `${formatNum(profile.stats?.worksTotal ?? 0)}`,   inline: true },
        { name: `${eco.hunt} Hunts`,      value: `${formatNum(profile.stats?.huntsTotal ?? 0)}`,   inline: true },
        { name: `${eco.battle} Battles`,  value: `${formatNum(profile.stats?.battlesWon ?? 0)} W / ${formatNum(profile.stats?.battlesLost ?? 0)} L`, inline: true },
        { name: `${eco.slots} Gambles`,   value: `${formatNum(profile.stats?.gamblesWon ?? 0)} W`, inline: true },
        { name: `${eco.protect} Rob Prot`,value: profile.robProtection ? `✅ Active` : "❌ None",  inline: true },
      )
      .setFooter({ text: `Total earned: ${formatNum(profile.stats?.coinsEarned ?? 0)} coins` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
