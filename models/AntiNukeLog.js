// ============================================================
//  models/AntiNukeLog.js
//  Antinuke action log entries
// ============================================================
const mongoose = require("mongoose");

const antiNukeLogSchema = new mongoose.Schema({
  guildId:     { type: String, required: true, index: true },
  action:      { type: String, required: true },
  // e.g. QUARANTINE, UNQUARANTINE, PANIC_ON, PANIC_OFF, BACKUP, RESTORE,
  //      MASS_CHANNEL_DELETE, MASS_ROLE_CREATE, MASS_BAN etc.
  filter:      { type: String, default: null   }, // which filter triggered
  targetId:    { type: String, default: null   }, // user/role/channel acted on
  targetTag:   { type: String, default: null   }, // display name
  executorId:  { type: String, default: null   }, // who did the bad thing (null = bot)
  executorTag: { type: String, default: null   },
  reason:      { type: String, default: null   },
  details:     { type: Object, default: null   }, // extra info (e.g. actions count)
  automated:   { type: Boolean, default: true  }, // true = bot triggered, false = manual
  severity:    { type: String, enum: ["low","medium","high","critical"], default: "high" },
}, { timestamps: true });

// Auto-delete logs after 30 days
antiNukeLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
antiNukeLogSchema.index({ guildId: 1, createdAt: -1 });

function fromConnection(connection) {
  if (connection.models["AntiNukeLog"]) return connection.models["AntiNukeLog"];
  return connection.model("AntiNukeLog", antiNukeLogSchema);
}

module.exports = { fromConnection };
