// ============================================================
//  ecomodels/Clan.js
//  Guild/Clan system — global
// ============================================================
const mongoose = require("mongoose");

const clanSchema = new mongoose.Schema({
  clanId:      { type: String, required: true, unique: true },
  name:        { type: String, required: true, unique: true }, // unique already creates index
  tag:         { type: String, required: true, unique: true, maxlength: 5 },
  description: { type: String, default: null, maxlength: 200 },
  icon:        { type: String, default: "⚔️" },
  ownerId:     { type: String, required: true },

  members: [{
    userId:       { type: String, required: true },
    role:         { type: String, enum: ["owner","officer","member"], default: "member" },
    joinedAt:     { type: Date,   default: Date.now },
    contribution: { type: Number, default: 0 },
  }],

  bank:      { type: Number, default: 0 },
  bankLimit: { type: Number, default: 50000 },
  level:     { type: Number, default: 1 },
  xp:        { type: Number, default: 0 },

  stats: {
    totalContributed: { type: Number, default: 0 },
    battlesWon:       { type: Number, default: 0 },
    battlesLost:      { type: Number, default: 0 },
  },

  isPublic:  { type: Boolean, default: true },
  createdAt: { type: Date,    default: Date.now },
}, { timestamps: true });

// ── Only index fields that don't already have unique:true ──
// name and tag already indexed via unique:true — no duplicates needed

module.exports = clanSchema;
