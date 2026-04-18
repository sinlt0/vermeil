// ============================================================
//  utils/eco/questScheduler.js
//  Assigns daily + weekly quests to users who need them
//  Runs every hour
// ============================================================
const chalk = require("chalk");

async function runQuestAssign(client) {
  try {
    const questConfig = require("../../ecoconfiguration/quests");
    const Quest       = client.ecoDb.getModel("Quest");
    const UserProfile = client.ecoDb.getModel("Userprofile");
    if (!Quest || !UserProfile) return;

    const now       = new Date();
    const today     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayOfWeek = now.getUTCDay();
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7));
    weekStart.setUTCHours(0, 0, 0, 0);

    const users = await UserProfile.find({ agreedToTos: true }).select("userId").lean();

    for (const user of users) {
      let doc      = await Quest.findOne({ userId: user.userId });
      let changed  = false;

      if (!doc) {
        doc     = new Quest({ userId: user.userId, active: [], completed: [] });
        changed = true;
      }

      // Remove expired quests
      const beforeLen = doc.active.length;
      doc.active = doc.active.filter(q => new Date(q.expiresAt) > now);
      if (doc.active.length !== beforeLen) changed = true;

      // Daily quests
      const lastDaily = doc.lastDailyAssign ? new Date(doc.lastDailyAssign) : null;
      if (!lastDaily || lastDaily < today) {
        const pool     = [...questConfig.daily].sort(() => Math.random() - 0.5);
        const toAssign = questConfig.dailyCount ?? 3;
        const dayEnd   = new Date(today);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

        for (const q of pool.slice(0, toAssign)) {
          // Don't re-assign already active quest
          if (doc.active.find(a => a.questId === q.id)) continue;
          doc.active.push({
            questId:   q.id,
            name:      q.name,
            type:      "daily",
            progress:  0,
            goal:      q.goal,
            reward:    q.reward,
            expiresAt: dayEnd,
          });
        }
        doc.lastDailyAssign = now;
        changed = true;
      }

      // Weekly quests
      const lastWeekly = doc.lastWeeklyAssign ? new Date(doc.lastWeeklyAssign) : null;
      if (!lastWeekly || lastWeekly < weekStart) {
        const pool     = [...questConfig.weekly].sort(() => Math.random() - 0.5);
        const toAssign = questConfig.weeklyCount ?? 2;
        const weekEnd  = new Date(weekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

        for (const q of pool.slice(0, toAssign)) {
          if (doc.active.find(a => a.questId === q.id)) continue;
          doc.active.push({
            questId:   q.id,
            name:      q.name,
            type:      "weekly",
            progress:  0,
            goal:      q.goal,
            reward:    q.reward,
            expiresAt: weekEnd,
          });
        }
        doc.lastWeeklyAssign = now;
        changed = true;
      }

      if (changed) await doc.save();
    }
  } catch (err) {
    console.error(chalk.red("  [Economy] Quest assign error:"), err.message);
  }
}

// ── Update quest progress from commands ───────────────────
async function updateQuestProgress(client, userId, activityType, amount = 1) {
  try {
    const Quest = client.ecoDb?.getModel("Quest");
    if (!Quest) return;

    const doc = await Quest.findOne({ userId });
    if (!doc?.active?.length) return;

    const now     = new Date();
    let   changed = false;

    for (const q of doc.active) {
      if (new Date(q.expiresAt) < now) continue;

      // Load quest config to check activityType
      const questConfig = require("../../ecoconfiguration/quests");
      const allQuests   = [...questConfig.daily, ...questConfig.weekly];
      const qConfig     = allQuests.find(c => c.id === q.questId);
      if (!qConfig || qConfig.activityType !== activityType) continue;

      q.progress = Math.min((q.progress || 0) + amount, q.goal);
      changed    = true;

      // Quest completed
      if (q.progress >= q.goal) {
        doc.completed.push({ questId: q.questId, reward: q.reward, completedAt: now });
        doc.active = doc.active.filter(a => a.questId !== q.questId);

        // Give reward
        await giveQuestReward(client, userId, q.reward, q.name);

        // Track weekly stat
        const { trackWeeklyStat } = require("../ecoLeaderboardUtils");
        await trackWeeklyStat(client, userId, "questsDone", 1);

        // Update profile stats
        const UserProfile = client.ecoDb.getModel("Userprofile");
        await UserProfile.findOneAndUpdate({ userId }, { $inc: { "stats.questsDone": 1 } });
      }
    }

    if (changed) await doc.save();
  } catch {}
}

async function giveQuestReward(client, userId, reward, questName) {
  try {
    const UserProfile = client.ecoDb?.getModel("Userprofile");
    if (!UserProfile) return;

    const inc = {};
    if (reward.coins  > 0) inc.wallet = reward.coins;
    if (reward.gems   > 0) inc.gems   = reward.gems;
    if (reward.tokens > 0) inc.tokens = reward.tokens;
    if (Object.keys(inc).length) await UserProfile.findOneAndUpdate({ userId }, { $inc: inc });

    // DM user
    const user = await client.users.fetch(userId).catch(() => null);
    if (user) {
      const parts = [];
      if (reward.coins  > 0) parts.push(`🪙 **${reward.coins.toLocaleString()}** coins`);
      if (reward.gems   > 0) parts.push(`💎 **${reward.gems}** gems`);
      if (reward.tokens > 0) parts.push(`🔮 **${reward.tokens}** tokens`);
      await user.send(`✅ **Quest Complete: ${questName}**\nReward: ${parts.join(", ")}`).catch(() => {});
    }
  } catch {}
}

function startQuestScheduler(client) {
  if (!client.ecoDb) return;
  runQuestAssign(client);
  setInterval(() => runQuestAssign(client), 60 * 60 * 1000); // every hour
  console.log(chalk.cyan("  [Economy] Quest scheduler started."));
}

module.exports = { startQuestScheduler, runQuestAssign, updateQuestProgress, giveQuestReward };
