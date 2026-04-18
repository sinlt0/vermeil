// ============================================================
//  models/Ticket.js
//  Active and closed ticket records
// ============================================================
const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    guildId:      { type: String, required: true },
    channelId:    { type: String, required: true, unique: true },
    userId:       { type: String, required: true }, // ticket creator
    categoryId:   { type: String, required: true }, // TicketCategory _id
    categoryName: { type: String, required: true },
    ticketNumber: { type: Number, required: true },
    status:       { type: String, enum: ["open", "closed"], default: "open" },
    claimedBy:    { type: String, default: null  }, // mod user ID
    // Auto-close tracking
    lastActivity: { type: Date,   default: Date.now },
    warnSent:     { type: Boolean, default: false  },
    // Form answers
    formAnswers:  { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

ticketSchema.index({ guildId: 1, userId: 1, status: 1 });
ticketSchema.index({ guildId: 1, ticketNumber: 1 });

function fromConnection(connection) {
  if (connection.models["Ticket"]) return connection.models["Ticket"];
  return connection.model("Ticket", ticketSchema);
}

module.exports = { fromConnection };
