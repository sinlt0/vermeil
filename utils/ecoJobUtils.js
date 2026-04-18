// ============================================================
//  utils/ecoJobUtils.js
//  Job system helpers
// ============================================================

// ============================================================
//  Get job config by ID
// ============================================================
function getJob(jobId) {
  const jobsConfig = require("../ecoconfiguration/jobs");
  return jobsConfig.jobs.find(j => j.id === jobId) ?? null;
}

// ============================================================
//  Calculate pay for a work session
//  Base pay + job level bonus + random variance
// ============================================================
function calculatePay(job, jobLevel) {
  const { min, max }     = job.pay;
  const levelBonus       = Math.floor((jobLevel - 1) * job.levelBonus ?? 50);
  const base             = Math.floor(Math.random() * (max - min + 1)) + min;
  return base + levelBonus;
}

// ============================================================
//  Check if user can be promoted
// ============================================================
function canPromote(jobDoc, job) {
  const nextLevel = jobDoc.jobLevel + 1;
  const maxLevel  = job.maxLevel ?? 10;
  if (nextLevel > maxLevel) return { can: false, reason: "Already at max level!" };

  const worksRequired = job.worksPerLevel ?? 10;
  if (jobDoc.worksTotal < worksRequired * jobDoc.jobLevel) {
    const remaining = worksRequired * jobDoc.jobLevel - jobDoc.worksTotal;
    return { can: false, reason: `Need ${remaining} more work sessions to promote.` };
  }
  return { can: true };
}

// ============================================================
//  Check if user meets requirements to switch to a job
// ============================================================
function meetsJobRequirements(jobDoc, targetJob) {
  if (!targetJob.requires) return { meets: true };
  const { minWorks, minLevel } = targetJob.requires;

  if (minWorks && jobDoc.worksLifetime < minWorks) {
    return { meets: false, reason: `Need ${minWorks} lifetime work sessions (you have ${jobDoc.worksLifetime}).` };
  }
  if (minLevel && jobDoc.jobLevel < minLevel) {
    return { meets: false, reason: `Need job level ${minLevel} to qualify.` };
  }
  return { meets: true };
}

// ============================================================
//  Get all jobs user is eligible for
// ============================================================
function getEligibleJobs(jobDoc) {
  const jobsConfig = require("../ecoconfiguration/jobs");
  return jobsConfig.jobs.filter(j => meetsJobRequirements(jobDoc, j).meets);
}

module.exports = { getJob, calculatePay, canPromote, meetsJobRequirements, getEligibleJobs };
