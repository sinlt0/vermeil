// ============================================================
//  models/BlacklistedWord.js
//  Per-guild word blacklist
// ============================================================
const mongoose = require("mongoose");

const blacklistedWordSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, index: true },
  word:       { type: String, required: true },
  type:       { type: String, enum: ["exact","wildcard"], default: "exact" },
  // exact    = must match exactly (case insensitive)
  // wildcard = word is a pattern e.g. *bad* matches "badword", "veryBad" etc.
  addedBy:    { type: String, default: null },
  addedAt:    { type: Date,   default: Date.now },
}, { timestamps: true });

blacklistedWordSchema.index({ guildId: 1, word: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["BlacklistedWord"]) return connection.models["BlacklistedWord"];
  return connection.model("BlacklistedWord", blacklistedWordSchema);
}

module.exports = { fromConnection };
