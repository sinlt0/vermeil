// ============================================================
//  models/Giveaway.js
//  Stores giveaway data per guild
// ============================================================
const mongoose = require("mongoose");

const bonusEntrySchema = new mongoose.Schema({
  roleId:  { type: String, required: true },
  entries: { type: Number, required: true, min: 1 },
}, { _id: false });

const giveawaySchema = new mongoose.Schema(
  {
    guildId:        { type: String,   required: true },
    channelId:      { type: String,   required: true },
    messageId:      { type: String,   required: true, unique: true },
    hostId:         { type: String,   required: true },
    prize:          { type: String,   required: true },
    winnerCount:    { type: Number,   default: 1     },
    endsAt:         { type: Date,     required: true  },
    status:         { type: String,   enum: ["active", "paused", "ended"], default: "active" },
    // Entries
    entries:        { type: [String], default: []    }, // array of user IDs (weighted)
    winners:        { type: [String], default: []    }, // drawn winner IDs
    // Requirements
    requiredRoles:  { type: [String], default: []    }, // must have ALL
    blacklistRoles: { type: [String], default: []    }, // must NOT have any
    blacklistUsers: { type: [String], default: []    }, // specific banned users
    // Bonus entries
    bonusEntries:   { type: [bonusEntrySchema], default: [] },
    // DM winners
    dmWinners:      { type: Boolean,  default: true  },
  },
  { timestamps: true }
);

giveawaySchema.index({ guildId: 1, status: 1 });
giveawaySchema.index({ endsAt: 1 });

function fromConnection(connection) {
  if (connection.models["Giveaway"]) return connection.models["Giveaway"];
  return connection.model("Giveaway", giveawaySchema);
}

module.exports = { fromConnection };
