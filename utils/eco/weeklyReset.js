// ============================================================
//  utils/eco/weeklyReset.js
//  Weekly leaderboard reset + reward distribution
//  Runs every Monday 00:00 UTC
//  Lifetime rewards distributed every 28 days
// ============================================================
const chalk = require("chalk");

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getNextMonday(date = new Date()) {
  const d    = new Date(date);
  const day  = d.getUTCDay();
  const diff = (8 - day) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekLabel(date) {
  const d   = new Date(date);
  const jan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk  = Math.ceil(((d - jan) / 86400000 + jan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(wk).padStart(2, "0")}`;
}

function getMonthLabel(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getTier(rank, total, tiers) {
  const pct = rank / total;
  for (const tier of tiers) {
    if (pct <= tier.threshold) return tier;
  }
  return tiers[tiers.length - 1];
}

function scaleReward(reward, multiplier) {
  return {
    coins:  Math.floor((reward.coins  || 0) * multiplier),
    gems:   Math.floor((reward.gems   || 0) * multiplier),
    tokens: Math.floor((reward.tokens || 0) * multiplier),
  };
}

async function distributeRewards(client) {
  const LeaderboardReward = client.ecoDb.getModel("Leaderboardreward");
  const UserProfile       = client.ecoDb.getModel("Userprofile");
  const lbConfig          = require("../../ecoconfiguration/leaderboard");
  const genConfig         = require("../../ecoconfiguration/general");
  if (!LeaderboardReward || !UserProfile) return;

  const pending = await LeaderboardReward.find({ distributed: false }).lean();
  if (!pending.length) return;

  for (const reward of pending) {
    try {
      const { coins = 0, gems = 0, tokens = 0 } = reward.reward;
      await UserProfile.findOneAndUpdate(
        { userId: reward.userId },
        { $inc: { wallet: coins, gems, tokens } }
      );
      await LeaderboardReward.findByIdAndUpdate(reward._id, {
        $set: { distributed: true, distributedAt: new Date() },
      });

      const user = await client.users.fetch(reward.userId).catch(() => null);
      if (user) {
        const parts = [];
        if (coins  > 0) parts.push(`🪙 **${coins.toLocaleString()}** coins`);
        if (gems   > 0) parts.push(`💎 **${gems}** gems`);
        if (tokens > 0) parts.push(`🔮 **${tokens}** tokens`);
        await user.send(
          `🏆 **Leaderboard Reward!**\n` +
          `You finished **#${reward.rank}** in **${reward.category}** (${reward.type === "weekly" ? "Weekly" : "Lifetime"})!\n` +
          `Reward: ${parts.join(", ")}`
        ).catch(() => {});
      }

      const channelId = lbConfig.announcementChannelId || genConfig.announcementChannelId;
      if (channelId) {
        const ch = client.channels.cache.get(channelId);
        if (ch) {
          await ch.send(
            `🏆 <@${reward.userId}> finished **#${reward.rank}** in **${reward.category}** ` +
            `(${reward.type === "weekly" ? "Weekly" : "Lifetime"}) and received rewards!`
          ).catch(() => {});
        }
      }
    } catch (err) {
      console.error(chalk.red("  [Economy] Reward distribution error:"), err.message);
    }
  }
  console.log(chalk.green(`  [Economy] ✅ Distributed ${pending.length} reward(s).`));
}

async function runWeeklyReset(client) {
  try {
    console.log(chalk.cyan("  [Economy] 🔄 Running weekly reset..."));

    const WeeklyStats       = client.ecoDb.getModel("Weeklystats");
    const LeaderboardReward = client.ecoDb.getModel("Leaderboardreward");
    const UserProfile       = client.ecoDb.getModel("Userprofile");
    const lbConfig          = require("../../ecoconfiguration/leaderboard");
    if (!WeeklyStats || !LeaderboardReward || !UserProfile) return;

    const weekStart    = getWeekStart();
    const weekLabel    = getWeekLabel(weekStart);
    const totalPlayers = await UserProfile.countDocuments({ agreedToTos: true });
    const rewardCount  = Math.max(3, Math.floor(totalPlayers * 0.1));

    for (const category of lbConfig.weeklyCategories) {
      const existing = await LeaderboardReward.findOne({ type: "weekly", category: category.field, period: weekLabel });
      if (existing) continue;

      const top = await WeeklyStats.find({ weekStart })
        .sort({ [category.field]: -1 })
        .limit(rewardCount)
        .lean();

      for (let i = 0; i < top.length; i++) {
        if ((top[i][category.field] ?? 0) === 0) continue;
        const tier   = getTier(i + 1, rewardCount, lbConfig.weeklyTiers);
        const reward = scaleReward(tier.reward, category.multiplier ?? 1);
        await LeaderboardReward.create({
          userId: top[i].userId, type: "weekly",
          category: category.field, rank: i + 1, reward, period: weekLabel,
        });
      }
      console.log(chalk.gray(`  [Economy] Weekly rewards queued: ${category.label}`));
    }

    // 28-day lifetime rewards
    const lastLifetime    = await LeaderboardReward.findOne({ type: "lifetime" }).sort({ createdAt: -1 }).lean();
    const daysSinceLast   = lastLifetime
      ? Math.floor((Date.now() - new Date(lastLifetime.createdAt).getTime()) / 86400000)
      : 999;

    if (daysSinceLast >= 28) {
      const monthLabel = getMonthLabel(new Date());
      for (const category of lbConfig.lifetimeCategories) {
        const existing = await LeaderboardReward.findOne({ type: "lifetime", category: category.field, period: monthLabel });
        if (existing) continue;
        const top = await UserProfile.find({ agreedToTos: true })
          .sort({ [category.field]: -1 })
          .limit(rewardCount)
          .select(`userId username ${category.field}`)
          .lean();
        for (let i = 0; i < top.length; i++) {
          const tier   = getTier(i + 1, rewardCount, lbConfig.lifetimeTiers);
          const reward = scaleReward(tier.reward, category.multiplier ?? 1);
          await LeaderboardReward.create({
            userId: top[i].userId, type: "lifetime",
            category: category.field, rank: i + 1, reward, period: monthLabel,
          });
        }
      }
      console.log(chalk.cyan("  [Economy] 💎 Lifetime rewards queued."));
    }

    await distributeRewards(client);
    console.log(chalk.green("  [Economy] ✅ Weekly reset complete."));
  } catch (err) {
    console.error(chalk.red("  [Economy] ❌ Weekly reset error:"), err.message);
  }
}

function startWeeklyReset(client) {
  if (!client.ecoDb) return;
  const scheduleNext = () => {
    const next  = getNextMonday();
    const delay = next.getTime() - Date.now();
    console.log(chalk.gray(`  [Economy] Next weekly reset: ${next.toUTCString()}`));
    setTimeout(async () => {
      await runWeeklyReset(client);
      scheduleNext();
    }, delay);
  };
  scheduleNext();
  console.log(chalk.cyan("  [Economy] Weekly reset scheduler started."));
}

module.exports = { startWeeklyReset, runWeeklyReset, distributeRewards, getWeekStart };
