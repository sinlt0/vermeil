// ============================================================
//  models/TwentyFourSeven.js
//  Per-guild 24/7 mode configuration
//  Only administrators can enable/disable this
// ============================================================
const mongoose = require("mongoose");

const tfSchema = new mongoose.Schema(
  {
    guildId:   { type: String, required: true, unique: true },
    enabled:   { type: Boolean, default: false },
    channelId: { type: String,  default: null  },
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["TwentyFourSeven"]) return connection.models["TwentyFourSeven"];
  return connection.model("TwentyFourSeven", tfSchema);
}

module.exports = { fromConnection };
