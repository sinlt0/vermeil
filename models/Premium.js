// ============================================================
//  models/Premium.js
//  Per-guild premium status — uses fromConnection pattern
// ============================================================
const mongoose = require("mongoose");

const premiumSchema = new mongoose.Schema(
  {
    guildId:    { type: String, required: true, unique: true, index: true },
    guildName:  { type: String, default: null },

    // Status
    active:     { type: Boolean, default: true },
    lifetime:   { type: Boolean, default: false },

    // Validity
    startedAt:  { type: Date, default: Date.now },
    expiresAt:  { type: Date, default: null },   // null = lifetime

    // Duration label for display
    duration:   { type: String, default: null }, // "1 month", "3 months" etc

    // Who granted it
    grantedBy:  { type: String, default: null }, // userId

    // Expiry warning tracking
    warnedAt:   { type: Date, default: null },   // when 3-day warning was sent
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["Premium"]) return connection.models["Premium"];
  return connection.model("Premium", premiumSchema);
}

module.exports = { fromConnection };
