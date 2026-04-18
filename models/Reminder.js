const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    guildId:   { type: String, required: true, index: true },
    channelId: { type: String, required: true },
    userId:    { type: String, required: true, index: true },
    message:   { type: String, required: true },
    dueAt:     { type: Date, required: true, index: true },
    status:    { type: String, enum: ["active", "sent", "failed", "cancelled"], default: "active", index: true },
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["Reminder"]) return connection.models["Reminder"];
  return connection.model("Reminder", reminderSchema);
}

module.exports = { fromConnection };