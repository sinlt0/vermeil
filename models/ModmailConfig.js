// ============================================================
//  models/ModmailConfig.js
//  Server-wide modmail configuration
// ============================================================
const mongoose = require("mongoose");

const modmailConfigSchema = new mongoose.Schema(
  {
    guildId:          { type: String,  required: true, unique: true },
    enabled:          { type: Boolean, default: false  },
    categoryId:       { type: String,  default: null   }, // Discord category for threads
    archiveCategoryId:{ type: String,  default: null   }, // Archive category
    logChannelId:     { type: String,  default: null   }, // Transcript logs
    alertRoleId:      { type: String,  default: null   }, // Pinged on new thread
    greetMessage:     { type: String,  default: "Thank you for contacting support! A staff member will be with you shortly." },
    closeMessage:     { type: String,  default: "Your modmail thread has been closed. Feel free to DM again if you need further assistance." },
    minAccountAge:    { type: Number,  default: 0      }, // days
    minServerAge:     { type: Number,  default: 0      }, // days
    blacklist:        { type: [String], default: []    }, // user IDs
    mentionOnReply:   { type: Boolean, default: true   }, // ping user in thread on reply
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["ModmailConfig"]) return connection.models["ModmailConfig"];
  return connection.model("ModmailConfig", modmailConfigSchema);
}

module.exports = { fromConnection };
