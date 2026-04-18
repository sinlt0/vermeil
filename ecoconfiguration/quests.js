// ============================================================
//  ecoconfiguration/quests.js
//  Daily and weekly quests
// ============================================================
module.exports = {

  dailyCount:  3,   // how many daily quests assigned per day
  weeklyCount: 2,   // how many weekly quests assigned per week

  // ── Daily Quests ──────────────────────────────────────
  daily: [
    {
      id:           "daily_hunt_5",
      name:         "Hunter's Trial",
      description:  "Complete 5 hunts.",
      activityType: "hunt",
      goal:         5,
      reward:       { coins: 2_000_000, gems: 100, tokens: 10 },
    },
    {
      id:           "daily_work_3",
      name:         "Hard Worker",
      description:  "Work 3 times.",
      activityType: "work",
      goal:         3,
      reward:       { coins: 1_000_500, gems: 300, tokens: 10 },
    },
    {
      id:           "daily_battle_2",
      name:         "Fighter",
      description:  "Win 2 battles.",
      activityType: "battle",
      goal:         2,
      reward:       { coins: 3_000_000, gems: 500, tokens: 10 },
    },
    {
      id:           "daily_crime_3",
      name:         "Street Life",
      description:  "Attempt 3 crimes.",
      activityType: "crime",
      goal:         3,
      reward:       { coins: 2_000_500, gems: 300, tokens: 10 },
    },
    {
      id:           "daily_gamble_5",
      name:         "Risk Taker",
      description:  "Gamble 5 times.",
      activityType: "gambling",
      goal:         5,
      reward:       { coins: 1_000_000, gems: 400, tokens: 10 },
    },
    {
      id:           "daily_beg_10",
      name:         "Humble Beginnings",
      description:  "Beg 10 times.",
      activityType: "beg",
      goal:         10,
      reward:       { coins: 800_000, gems: 200, tokens: 5 },
    },
  ],

  // ── Weekly Quests ─────────────────────────────────────
  weekly: [
    {
      id:           "weekly_hunt_30",
      name:         "Master Hunter",
      description:  "Complete 30 hunts this week.",
      activityType: "hunt",
      goal:         30,
      reward:       { coins: 20_000_000, gems: 2_000, tokens: 50 },
    },
    {
      id:           "weekly_work_20",
      name:         "Workaholic",
      description:  "Work 20 times this week.",
      activityType: "work",
      goal:         20,
      reward:       { coins: 15_000_000, gems: 1_000, tokens: 50 },
    },
    {
      id:           "weekly_battle_15",
      name:         "War Machine",
      description:  "Win 15 battles this week.",
      activityType: "battle",
      goal:         15,
      reward:       { coins: 30_000_000, gems: 3_000, tokens: 80 },
    },
    {
      id:           "weekly_earn_5M",
      name:         "Money Maker",
      description:  "Earn 5,000,000 coins this week.",
      activityType: "coinsEarned",
      goal:         5_000_000,
      reward:       { coins: 25_000, gems: 2_000, tokens: 50 },
    },
    {
      id:           "weekly_legendary_catch",
      name:         "Legendary Hunt",
      description:  "Catch 1 legendary creature.",
      activityType: "legendary_hunt",
      goal:         1,
      reward:       { coins: 50_000_000, gems: 5_000, tokens: 100 },
    },
  ],

};
