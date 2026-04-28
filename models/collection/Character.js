// ============================================================
//  models/collection/Character.js
//  GLOBAL character database — shared across all servers
//  Images fetched on-demand from AniList/Kitsu APIs
//  Only stores metadata, never image blobs
// ============================================================
const mongoose = require("mongoose");

const characterSchema = new mongoose.Schema({
  // Identity
  name:       { type: String, required: true, index: true },
  aliases:    [{ type: String }],         // alternate names/spellings
  series:     { type: String, required: true, index: true },
  seriesAliases: [{ type: String }],

  // Type
  type:       { type: String, enum: ["waifu","husbando"], required: true, index: true },
  source:     { type: String, enum: ["anime","manga","game","vn"], default: "anime", index: true },

  // Image — stored as URL string only, never blob
  imageUrl:   { type: String, default: null },   // manual override URL
  imageSource:{ type: String, enum: ["anilist","kitsu","manual","none"], default: "anilist" },
  anilistId:  { type: Number, default: null },    // for AniList API lookups
  kitsuId:    { type: String, default: null },    // for Kitsu API fallback

  // Global stats (updated as characters get claimed/liked across all servers)
  globalClaimCount: { type: Number, default: 0 },
  globalLikeCount:  { type: Number, default: 0 },

  // Base kakera value (scales with claim/like rank)
  baseKakera: { type: Number, default: 50 },

  // Rollable
  enabled:    { type: Boolean, default: true, index: true },
  nsfw:       { type: Boolean, default: false },

}, { timestamps: true });

characterSchema.index({ name: 1, series: 1 }, { unique: true });
characterSchema.index({ type: 1, source: 1, enabled: 1 });
characterSchema.index({ globalClaimCount: -1 });
characterSchema.index({ globalLikeCount: -1 });

// Text search index for $im lookups
characterSchema.index({ name: "text", series: "text", aliases: "text" });

function fromConnection(connection) {
  if (connection.models["Character"]) return connection.models["Character"];
  return connection.model("Character", characterSchema);
}

module.exports = { fromConnection };
