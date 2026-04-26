// ============================================================
//  commands/economy/work.js
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { addCoins, setCooldown, isCooldownReady, getRemainingCooldown, formatCooldown, addXP, formatNum } = require("../../utils/ecoUtils");
const { calculatePay } = require("../../utils/ecoJobUtils");
const { trackWeeklyStat } = require("../../utils/ecoLeaderboardUtils");
const { updateQuestProgress } = require("../../utils/eco/questScheduler");
const eco = require("../../emojis/ecoemoji");

module.exports = {
  name: "work", description: "Work your job to earn coins.", category: "economy",
  aliases: ["w"], usage: "", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Job  = client.ecoDb.getModel("Job");
    const jobDoc = await Job.findOne({ userId: message.author.id });

    if (!jobDoc?.jobId) {
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.error} You don't have a job! Use \`!jobs\` to browse available jobs and \`!job <name>\` to apply.`)] });
    }

    const jobsConfig = require("../../ecoconfiguration/jobs");
    const job        = jobsConfig.jobs.find(j => j.id === jobDoc.jobId);
    if (!job) return message.reply(`${eco.error} Your job no longer exists. Use \`!job resign\` and pick a new one.`);

    if (!isCooldownReady(jobDoc.updatedAt, job.cooldownMs)) {
      const remaining = getRemainingCooldown(jobDoc.updatedAt, job.cooldownMs);
      return message.reply({ embeds: [new EmbedBuilder().setColor(0x4A3F5F)
        .setDescription(`${eco.cooldown} You're tired! Rest for **${formatCooldown(remaining)}** before working again.`)] });
    }

    const pay = calculatePay(job, jobDoc.jobLevel);
    await addCoins(client, message.author.id, pay, "work");

    // Update job progress
    await Job.findOneAndUpdate(
      { userId: message.author.id },
      { $inc: { worksTotal: 1, worksLifetime: 1 }, $set: { updatedAt: new Date() } }
    );

    const UserProfile = client.ecoDb.getModel("Userprofile");
    await UserProfile.findOneAndUpdate({ userId: message.author.id }, { $inc: { "stats.worksTotal": 1, "stats.coinsEarned": pay } });

    await addXP(client, message.author.id, 50);
    await trackWeeklyStat(client, message.author.id, "worksTotal", 1);
    await trackWeeklyStat(client, message.author.id, "coinsEarned", pay);
    await updateQuestProgress(client, message.author.id, "work", 1);

    // Pick random response
    const response = job.responses[Math.floor(Math.random() * job.responses.length)]
      .replace("{amount}", formatNum(pay));

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${job.emoji} Work Complete!`)
      .setDescription(`${response}\n\n${eco.coin} **+${formatNum(pay)} coins**`)
      .setFooter({ text: `${job.name} Lv.${jobDoc.jobLevel} • Works: ${jobDoc.worksTotal + 1}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
