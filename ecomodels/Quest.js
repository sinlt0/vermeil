// ============================================================
//  ecomodels/Quest.js
//  User quest progress — global
// ============================================================
const mongoose = require("mongoose");

const questSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },

  // Active quests
  active: [{
    questId:    { type: String, required: true },
    name:       { type: String, required: true },
    type:       { type: String, enum: ["daily", "weekly", "special"] },
    progress:   { type: Number, default: 0 },
    goal:       { type: Number, required: true },
    reward:     { type: Object, default: {} }, // { coins, gems, tokens, items }
    expiresAt:  { type: Date,   required: true },
    assignedAt: { type: Date,   default: Date.now },
  }],

  // Completed quest IDs + timestamps
  completed: [{
    questId:     { type: String },
    completedAt: { type: Date, default: Date.now },
    reward:      { type: Object, default: {} },
  }],

  lastDailyAssign:  { type: Date, default: null },
  lastWeeklyAssign: { type: Date, default: null },
}, { timestamps: true });

module.exports = questSchema;
