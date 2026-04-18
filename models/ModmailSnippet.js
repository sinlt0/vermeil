// ============================================================
//  models/ModmailSnippet.js
//  Server-wide saved quick reply snippets
// ============================================================
const mongoose = require("mongoose");

const modmailSnippetSchema = new mongoose.Schema(
  {
    guildId:  { type: String, required: true },
    name:     { type: String, required: true },
    content:  { type: String, required: true },
    createdBy:{ type: String, required: true },
  },
  { timestamps: true }
);

modmailSnippetSchema.index({ guildId: 1, name: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["ModmailSnippet"]) return connection.models["ModmailSnippet"];
  return connection.model("ModmailSnippet", modmailSnippetSchema);
}

module.exports = { fromConnection };
