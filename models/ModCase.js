// ============================================================
//  models/ModCase.js
//  Stores moderation cases per guild
//  Case numbers are per-server
// ============================================================
const mongoose = require("mongoose");

const modCaseSchema = new mongoose.Schema(
  {
    guildId:     { type: String, required: true },
    caseNumber:  { type: Number, required: true },
    action:      {
      type: String,
      enum: ["warn", "kick", "ban", "tempban", "unban", "timeout", "untimeout"],
      required: true,
    },
    targetId:    { type: String, required: true },  // user ID
    targetTag:   { type: String, required: true },  // user#0000
    moderatorId: { type: String, required: true },
    moderatorTag:{ type: String, required: true },
    reason:      { type: String, default: "No reason provided." },
    duration:    { type: Number, default: null },    // ms, for timeout/tempban
    expiresAt:   { type: Date,   default: null },    // for tempban/timeout
    active:      { type: Boolean, default: true },   // false once expired/resolved
  },
  { timestamps: true }
);

// Compound index for fast per-guild lookups
modCaseSchema.index({ guildId: 1, caseNumber: 1 }, { unique: true });
modCaseSchema.index({ guildId: 1, targetId: 1 });

function fromConnection(connection) {
  if (connection.models["ModCase"]) return connection.models["ModCase"];
  return connection.model("ModCase", modCaseSchema);
}

module.exports = { fromConnection };
