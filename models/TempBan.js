// ============================================================
//  models/TempBan.js
//  Tracks active temporary bans for auto-unban on expiry
//  Persists across bot restarts
// ============================================================
const mongoose = require("mongoose");

const tempBanSchema = new mongoose.Schema(
  {
    guildId:   { type: String, required: true },
    userId:    { type: String, required: true },
    userTag:   { type: String, required: true },
    expiresAt: { type: Date,   required: true },
    caseNumber:{ type: Number, required: true },
  },
  { timestamps: true }
);

tempBanSchema.index({ guildId: 1, userId: 1 }, { unique: true });
tempBanSchema.index({ expiresAt: 1 });

function fromConnection(connection) {
  if (connection.models["TempBan"]) return connection.models["TempBan"];
  return connection.model("TempBan", tempBanSchema);
}

module.exports = { fromConnection };
