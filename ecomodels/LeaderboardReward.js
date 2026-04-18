// ============================================================
//  ecomodels/LeaderboardReward.js
//  Tracks distributed leaderboard rewards
// ============================================================
const mongoose = require("mongoose");

const leaderboardRewardSchema = new mongoose.Schema({
  userId:      { type: String, required: true, index: true },
  type:        { type: String, enum: ["weekly","lifetime"], required: true },
  category:    { type: String, required: true }, // e.g. "coinsEarned","huntsTotal"
  rank:        { type: Number, required: true },
  reward:      { type: Object, required: true }, // { coins, gems, tokens }
  period:      { type: String, required: true }, // e.g. "2026-W14" or "2026-04"
  distributed: { type: Boolean, default: false },
  distributedAt:{ type: Date,  default: null   },
}, { timestamps: true });

module.exports = leaderboardRewardSchema;
