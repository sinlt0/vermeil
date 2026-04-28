// ============================================================
//  models/collection/LikeList.js
//  Per-user per-guild like list (unclaimed chars you like)
// ============================================================
const mongoose = require("mongoose");

const likeListSchema = new mongoose.Schema({
  guildId:     { type: String, required: true },
  userId:      { type: String, required: true },
  characterId: { type: mongoose.Schema.Types.ObjectId, ref: "Character" },
  name:        { type: String, required: true },
  series:      { type: String },
  addedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

likeListSchema.index({ guildId: 1, userId: 1 });
likeListSchema.index({ guildId: 1, userId: 1, name: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["LikeList"]) return connection.models["LikeList"];
  return connection.model("LikeList", likeListSchema);
}

module.exports = { fromConnection };
