// ============================================================
//  commands/economy/job.js
//  View current job, apply, resign, promote
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { ecoError, ecoSuccess, formatNum } = require("../../utils/ecoUtils");
const { getJob, canPromote, meetsJobRequirements } = require("../../utils/ecoJobUtils");
const eco      = require("../../emojis/ecoemoji");
const jobsConf = require("../../ecoconfiguration/jobs");

module.exports = {
  name: "job", description: "Manage your job.", category: "economy",
  aliases: [], usage: "[apply <jobId> | resign | promote | info]", cooldown: 3, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Job    = client.ecoDb.getModel("Job");
    const sub    = ctx.args[0]?.toLowerCase();
    const jobDoc = await Job.findOne({ userId: message.author.id }) ?? await Job.create({ userId: message.author.id });

    // ── View current job ──────────────────────────────
    if (!sub || sub === "info") {
      if (!jobDoc.jobId) return message.reply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setDescription(`${eco.job} You are currently **unemployed**. Use \`!jobs\` to browse jobs.`)] });
      const job  = getJob(jobDoc.jobId);
      if (!job) return message.reply(`${eco.error} Job not found.`);
      const next = jobsConf.worksPerLevel * jobDoc.jobLevel;
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${job.emoji} ${job.name}`)
        .addFields(
          { name: "Level",     value: `${jobDoc.jobLevel} / ${job.maxLevel}`, inline: true },
          { name: "Works Done",value: `${jobDoc.worksTotal} / ${next} (for promotion)`, inline: true },
          { name: "Pay Range", value: `${formatNum(job.pay.min)} - ${formatNum(job.pay.max)} coins`, inline: true },
          { name: "Cooldown",  value: `${job.cooldownMs / 1000}s`, inline: true },
        )
        .setTimestamp();
      return message.reply({ embeds: [embed] });
    }

    // ── Apply for a job ───────────────────────────────
    if (sub === "apply") {
      const jobId = ctx.args[1]?.toLowerCase();
      if (!jobId) return message.reply(`${eco.error} Provide a job ID. Use \`!jobs\` to see all jobs.`);
      const job = getJob(jobId);
      if (!job) return message.reply(`${eco.error} Job **${jobId}** not found. Use \`!jobs\` to see all jobs.`);

      const req = meetsJobRequirements(jobDoc, job);
      if (!req.meets) return message.reply({ embeds: [ecoError(req.reason)] });

      await Job.findOneAndUpdate(
        { userId: message.author.id },
        { $set: { jobId: job.id, jobName: job.name, jobLevel: 1, worksTotal: 0, hiredAt: new Date() } },
        { upsert: true }
      );
      return message.reply({ embeds: [ecoSuccess(`You are now a **${job.emoji} ${job.name}**! Use \`!work\` to start earning.`, `${eco.promoted} Job Accepted`)] });
    }

    // ── Resign ────────────────────────────────────────
    if (sub === "resign") {
      if (!jobDoc.jobId) return message.reply(`${eco.error} You're not employed!`);
      await Job.findOneAndUpdate({ userId: message.author.id }, { $set: { jobId: null, jobName: null, jobLevel: 1, worksTotal: 0 } });
      return message.reply({ embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription(`${eco.fired} You resigned from your job.`)] });
    }

    // ── Promote ───────────────────────────────────────
    if (sub === "promote") {
      if (!jobDoc.jobId) return message.reply(`${eco.error} You need a job first!`);
      const job    = getJob(jobDoc.jobId);
      const result = canPromote(jobDoc, job);
      if (!result.can) return message.reply({ embeds: [ecoError(result.reason)] });

      await Job.findOneAndUpdate({ userId: message.author.id }, { $inc: { jobLevel: 1, promotions: 1 } });
      return message.reply({ embeds: [ecoSuccess(`You've been promoted to **${job.name} Lv.${jobDoc.jobLevel + 1}**! Your pay has increased!`, `${eco.promoted} Promoted!`)] });
    }

    return message.reply(`${eco.error} Unknown subcommand. Use: \`apply <id>\`, \`resign\`, \`promote\`, or leave blank to view your job.`);
  },
};
