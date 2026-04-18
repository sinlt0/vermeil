// ============================================================
//  ecomodels/WeeklyStats.js
//  Weekly tracking for leaderboard categories
//  Resets every Monday
// ============================================================
const mongoose = require("mongoose");

const weeklyStatsSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },
  weekStart:     { type: Date,   required: true, index: true }, // Monday 00:00 UTC

  // Categories
  coinsEarned:   { type: Number, default: 0 },
  huntsTotal:    { type: Number, default: 0 },
  battlesWon:    { type: Number, default: 0 },
  crimesTotal:   { type: Number, default: 0 },
  questsDone:    { type: Number, default: 0 },
  worksTotal:    { type: Number, default: 0 },
  gamblesWon:    { type: Number, default: 0 },
  robsSuccess:   { type: Number, default: 0 },
}, { timestamps: true });

weeklyStatsSchema.index({ weekStart: 1, coinsEarned: -1 });
weeklyStatsSchema.index({ weekStart: 1, huntsTotal:  -1 });
weeklyStatsSchema.index({ weekStart: 1, battlesWon:  -1 });
weeklyStatsSchema.index({ weekStart: 1, userId: 1    }, { unique: true });

module.exports = weeklyStatsSchema;
