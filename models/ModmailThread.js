// ============================================================
//  models/ModmailThread.js
//  Individual modmail thread records
// ============================================================
const mongoose = require("mongoose");

const modmailThreadSchema = new mongoose.Schema(
  {
    guildId:     { type: String, required: true },
    channelId:   { type: String, required: true, unique: true },
    userId:      { type: String, required: true },
    userTag:     { type: String, required: true },
    status:      { type: String, enum: ["open", "pending", "on-hold", "closed"], default: "open" },
    priority:    { type: String, enum: ["low", "medium", "high", "urgent"],      default: "medium" },
    claimedBy:   { type: String, default: null  },
    closedBy:    { type: String, default: null  },
    closeReason: { type: String, default: null  },
    autoCloseAt: { type: Date,   default: null  }, // for close in <time>
    warnSent:    { type: Boolean, default: false },
    threadNumber:{ type: Number, required: true },
    messageCount:{ type: Number, default: 0     },
  },
  { timestamps: true }
);

modmailThreadSchema.index({ guildId: 1, userId: 1 });
modmailThreadSchema.index({ guildId: 1, threadNumber: 1 });

function fromConnection(connection) {
  if (connection.models["ModmailThread"]) return connection.models["ModmailThread"];
  return connection.model("ModmailThread", modmailThreadSchema);
}

module.exports = { fromConnection };
