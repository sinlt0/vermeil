// ============================================================
//  ecoconfiguration/leaderboard.js
//  Leaderboard categories + reward tiers
// ============================================================
module.exports = {

  // ── Announcement channel ──────────────────────────────
  announcementChannelId: null,  // set channel ID for lb announcements

  // ── Weekly leaderboard categories ────────────────────
  weeklyCategories: [
    { field: "coinsEarned",  label: "Most Coins Earned",   multiplier: 1   },
    { field: "huntsTotal",   label: "Most Hunts",          multiplier: 0.8 },
    { field: "battlesWon",   label: "Most Battles Won",    multiplier: 1.2 },
    { field: "crimesTotal",  label: "Most Crimes",         multiplier: 0.7 },
    { field: "questsDone",   label: "Most Quests Done",    multiplier: 1.5 },
    { field: "worksTotal",   label: "Most Works Done",     multiplier: 0.9 },
    { field: "gamblesWon",   label: "Most Gambles Won",    multiplier: 0.6 },
    { field: "robsSuccess",  label: "Most Successful Robs",multiplier: 0.8 },
  ],

  // ── Lifetime leaderboard categories ──────────────────
  lifetimeCategories: [
    { field: "wallet",               label: "Richest",           multiplier: 2.0 },
    { field: "level",                label: "Highest Level",     multiplier: 1.5 },
    { field: "stats.battlesWon",     label: "Most Battle Wins",  multiplier: 1.8 },
    { field: "stats.huntsTotal",     label: "Most Hunts",        multiplier: 1.3 },
    { field: "stats.questsDone",     label: "Most Quests",       multiplier: 1.6 },
    { field: "stats.coinsEarned",    label: "Most Coins Ever",   multiplier: 2.5 },
  ],

  // ── Weekly reward tiers ───────────────────────────────
  // threshold = top X% of rewardCount gets this tier
  weeklyTiers: [
    { threshold: 0.05,  reward: { coins: 50_000,  gems: 10, tokens: 20 } }, // top 5%
    { threshold: 0.15,  reward: { coins: 25_000,  gems: 5,  tokens: 10 } }, // top 15%
    { threshold: 0.30,  reward: { coins: 10_000,  gems: 2,  tokens: 5  } }, // top 30%
    { threshold: 1.00,  reward: { coins: 3_000,   gems: 0,  tokens: 2  } }, // rest
  ],

  // ── Lifetime reward tiers (distributed every 28 days) ─
  lifetimeTiers: [
    { threshold: 0.05,  reward: { coins: 200_000, gems: 30, tokens: 50 } },
    { threshold: 0.15,  reward: { coins: 100_000, gems: 15, tokens: 25 } },
    { threshold: 0.30,  reward: { coins: 50_000,  gems: 5,  tokens: 10 } },
    { threshold: 1.00,  reward: { coins: 10_000,  gems: 1,  tokens: 3  } },
  ],

};
