// ============================================================
//  models/TicketConfig.js
//  Server-wide ticket system settings
// ============================================================
const mongoose = require("mongoose");

const ticketConfigSchema = new mongoose.Schema(
  {
    guildId:           { type: String,  required: true, unique: true },
    enabled:           { type: Boolean, default: false  },
    logChannel:        { type: String,  default: null   }, // mod log channel
    transcriptChannel: { type: String,  default: null   }, // where transcripts go
    ticketLimit:       { type: Number,  default: 1      }, // max open tickets per user
    autoCloseTime:     { type: Number,  default: null   }, // ms, null = disabled
    warnTime:          { type: Number,  default: null   }, // ms before close to warn
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["TicketConfig"]) return connection.models["TicketConfig"];
  return connection.model("TicketConfig", ticketConfigSchema);
}

module.exports = { fromConnection };
