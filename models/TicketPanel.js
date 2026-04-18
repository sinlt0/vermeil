// ============================================================
//  models/TicketPanel.js
//  Stores sent ticket panels
// ============================================================
const mongoose = require("mongoose");

const ticketPanelSchema = new mongoose.Schema(
  {
    guildId:     { type: String,   required: true },
    channelId:   { type: String,   required: true },
    messageId:   { type: String,   required: true },
    title:       { type: String,   default: "Support Tickets" },
    description: { type: String,   default: "Select a category below to open a ticket." },
    color:       { type: String,   default: "#5865F2" },
    categories:  { type: [String], default: [] }, // TicketCategory _id references
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["TicketPanel"]) return connection.models["TicketPanel"];
  return connection.model("TicketPanel", ticketPanelSchema);
}

module.exports = { fromConnection };
