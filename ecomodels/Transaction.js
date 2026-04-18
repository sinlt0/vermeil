// ============================================================
//  ecomodels/Transaction.js
//  Economy transaction history — global
// ============================================================
const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId:    { type: String, required: true, index: true },
  type:      { type: String, required: true },
  // e.g. "daily","work","rob","crime","shop_buy","pay","hunt","battle","quest"
  amount:    { type: Number, required: true }, // positive = earned, negative = spent
  currency:  { type: String, enum: ["coins","gems","tokens"], default: "coins" },
  details:   { type: String, default: null  }, // human readable note
  targetId:  { type: String, default: null  }, // other user if applicable
}, { timestamps: true });

// Auto-delete old transactions after 30 days
transactionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = transactionSchema;
