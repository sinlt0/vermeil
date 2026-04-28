// ============================================================
//  models/collection/TradeSession.js
//  Active trade sessions between two users
// ============================================================
const mongoose = require("mongoose");

const tradeOfferSchema = new mongoose.Schema({
  characterIds: [{ type: mongoose.Schema.Types.ObjectId }],
  characterNames: [{ type: String }],
  kakera: { type: Number, default: 0 },
  confirmed: { type: Boolean, default: false },
}, { _id: false });

const tradeSessionSchema = new mongoose.Schema({
  guildId:    { type: String, required: true },
  initiatorId:{ type: String, required: true },
  targetId:   { type: String, required: true },

  initiatorOffer: { type: tradeOfferSchema, default: () => ({}) },
  targetOffer:    { type: tradeOfferSchema, default: () => ({}) },

  status: {
    type: String,
    enum: ["pending","negotiating","confirmed","completed","cancelled"],
    default: "pending",
  },

  messageId: { type: String, default: null }, // trade message to update
  channelId:  { type: String, default: null },

  expiresAt: { type: Date, default: () => new Date(Date.now() + 5 * 60 * 1000) },

}, { timestamps: true });

// Auto-delete after 10 minutes
tradeSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
tradeSessionSchema.index({ guildId: 1, initiatorId: 1 });

function fromConnection(connection) {
  if (connection.models["TradeSession"]) return connection.models["TradeSession"];
  return connection.model("TradeSession", tradeSessionSchema);
}

module.exports = { fromConnection };
