// ============================================================
//  commands/economy/jobs.js
//  Browse available jobs
// ============================================================
const { EmbedBuilder } = require("discord.js");
const { ecoCheck }     = require("../../utils/ecoMiddleware");
const { formatNum }    = require("../../utils/ecoUtils");
const { getEligibleJobs, meetsJobRequirements } = require("../../utils/ecoJobUtils");
const eco      = require("../../emojis/ecoemoji");
const jobsConf = require("../../ecoconfiguration/jobs");

module.exports = {
  name: "ecojobs", description: "Browse all available jobs.", category: "economy",
  aliases: ["ecojoblist"], usage: "", cooldown: 5, slash: false,

  async execute(client, ctx) {
    const message = ctx.message;
    if (!await ecoCheck(client, message)) return;

    const Job    = client.ecoDb.getModel("Job");
    const jobDoc = await Job.findOne({ userId: message.author.id }).lean();

    const lines = jobsConf.jobs.map(j => {
      const eligible = meetsJobRequirements(jobDoc ?? {}, j).meets;
      const current  = jobDoc?.jobId === j.id ? " ← Current" : "";
      const lock     = eligible ? eco.unlocked : eco.locked;
      return `${lock} ${j.emoji} **${j.name}**${current}\n` +
             `┣ Pay: ${formatNum(j.pay.min)}-${formatNum(j.pay.max)} ${eco.coin} | CD: ${j.cooldownMs/1000}s\n` +
             `┗ Req: ${j.requires ? `${j.requires.minWorks} lifetime works` : "None"} | ID: \`${j.id}\``;
    });

    const embed = new EmbedBuilder()
      .setColor(0x4A3F5F)
      .setTitle(`${eco.job} Available Jobs`)
      .setDescription(lines.join("\n\n"))
      .setFooter({ text: "Use !job apply <id> to apply for a job" })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  },
};
