// ============================================================
//  ecomodels/Marriage.js
//  Marriage and bond system — global
// ============================================================
const mongoose = require("mongoose");

const marriageSchema = new mongoose.Schema({
  // Marriage
  user1:       { type: String, required: true },
  user2:       { type: String, required: true },
  type:        { type: String, enum: ["marriage", "bond"], required: true },
  marriedAt:   { type: Date,   default: Date.now },

  // Benefits tracking
  coinsShared: { type: Number, default: 0 },
  bonusEarned: { type: Number, default: 0 },

  // Bond specific
  bondLevel:   { type: Number, default: 1  },
  bondXp:      { type: Number, default: 0  },
  bondPerks: [{
    perkId:    { type: String },
    unlockedAt:{ type: Date, default: Date.now },
  }],
}, { timestamps: true });

marriageSchema.index({ user1: 1, user2: 1 }, { unique: true });

module.exports = marriageSchema;
