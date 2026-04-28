// ============================================================
//  models/collection/Wishlist.js
//  Per-user per-guild wishlist
// ============================================================
const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
  guildId:   { type: String, required: true },
  userId:    { type: String, required: true },
  name:      { type: String, required: true },   // character or series name
  isSeries:  { type: Boolean, default: false },  // true = series wish
  boostedRolls: { type: Number, default: 0 },    // $bw invest rolls to boost
  isFirstWish:  { type: Boolean, default: false },// $fw first wish (extra boost)
  addedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

wishlistSchema.index({ guildId: 1, userId: 1 });
wishlistSchema.index({ guildId: 1, userId: 1, name: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["Wishlist"]) return connection.models["Wishlist"];
  return connection.model("Wishlist", wishlistSchema);
}

module.exports = { fromConnection };
