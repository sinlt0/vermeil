// ============================================================
//  models/BlacklistedLink.js
//  Per-guild link blacklist — instant punishment
// ============================================================
const mongoose = require("mongoose");

const blacklistedLinkSchema = new mongoose.Schema({
  guildId:    { type: String, required: true, index: true },
  link:       { type: String, required: true },
  // Stored normalized (no https://, lowercase)
  addedBy:    { type: String, default: null },
  addedAt:    { type: Date,   default: Date.now },
}, { timestamps: true });

blacklistedLinkSchema.index({ guildId: 1, link: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["BlacklistedLink"]) return connection.models["BlacklistedLink"];
  return connection.model("BlacklistedLink", blacklistedLinkSchema);
}

module.exports = { fromConnection };
