// ============================================================
//  ecomodels/Creature.js
//  User's caught creature collection (OWO-style)
// ============================================================
const mongoose = require("mongoose");

const creatureSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  creatureId:{ type: String, required: true },
  name:      { type: String, required: true },
  emoji:     { type: String, default: "🐾" },
  rarity:    { type: String, enum: ["common","uncommon","rare","epic","legendary"], default: "common" },
  level:     { type: Number, default: 1 },
  xp:        { type: Number, default: 0 },
  // Battle stats
  hp:        { type: Number, default: 100 },
  attack:    { type: Number, default: 10  },
  defense:   { type: Number, default: 5   },
  speed:     { type: Number, default: 5   },
  // Tracking
  caughtAt:  { type: Date,   default: Date.now },
  battlesWon:{ type: Number, default: 0 },
  isTeam:    { type: Boolean, default: false }, // in battle team
  teamSlot:  { type: Number, default: null },   // 1-3
}, { timestamps: true });

creatureSchema.index({ userId: 1, rarity: 1 });

module.exports = creatureSchema;
