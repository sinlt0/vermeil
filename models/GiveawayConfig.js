// ============================================================
//  models/GiveawayConfig.js
//  Per-guild giveaway host configuration
// ============================================================
const mongoose = require("mongoose");

const giveawayConfigSchema = new mongoose.Schema(
  {
    guildId:  { type: String,   required: true, unique: true },
    hostRoles:{ type: [String], default: []    }, // role IDs that can host
    hostUsers:{ type: [String], default: []    }, // user IDs that can host
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["GiveawayConfig"]) return connection.models["GiveawayConfig"];
  return connection.model("GiveawayConfig", giveawayConfigSchema);
}

module.exports = { fromConnection };
