// ============================================================
//  models/AutoRole.js
//  Stores autorole configuration per guild
// ============================================================
const mongoose = require("mongoose");

const autoRoleSchema = new mongoose.Schema(
  {
    guildId:    { type: String,   required: true, unique: true },
    humanRoles: { type: [String], default: [] }, // role IDs for humans
    botRoles:   { type: [String], default: [] }, // role IDs for bots
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["AutoRole"]) return connection.models["AutoRole"];
  return connection.model("AutoRole", autoRoleSchema);
}

module.exports = { fromConnection };
