// ============================================================
//  models/WarnConfig.js
//  Per-guild warn threshold configuration
//  Each threshold maps a warn count to an action
// ============================================================
const mongoose = require("mongoose");

const thresholdSchema = new mongoose.Schema({
  count:    { type: Number, required: true },  // warn count that triggers this
  action:   {
    type: String,
    enum: ["timeout", "kick", "tempban", "ban"],
    required: true,
  },
  duration: { type: Number, default: null },   // ms, required for timeout/tempban
}, { _id: false });

const warnConfigSchema = new mongoose.Schema(
  {
    guildId:    { type: String, required: true, unique: true },
    thresholds: { type: [thresholdSchema], default: [] },
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["WarnConfig"]) return connection.models["WarnConfig"];
  return connection.model("WarnConfig", warnConfigSchema);
}

module.exports = { fromConnection };
