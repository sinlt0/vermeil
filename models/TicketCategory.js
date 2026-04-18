// ============================================================
//  models/TicketCategory.js
//  Per-category ticket configuration
// ============================================================
const mongoose = require("mongoose");

const formQuestionSchema = new mongoose.Schema({
  label:       { type: String,  required: true           },
  placeholder: { type: String,  default: null            },
  style:       { type: String,  enum: ["short", "paragraph"], default: "short" },
  required:    { type: Boolean, default: true            },
  minLength:   { type: Number,  default: null            },
  maxLength:   { type: Number,  default: null            },
}, { _id: false });

const ticketCategorySchema = new mongoose.Schema(
  {
    guildId:         { type: String,   required: true },
    name:            { type: String,   required: true },
    description:     { type: String,   default: null  },
    emoji:           { type: String,   default: "🎫"  },
    supportRoles:    { type: [String], default: []    }, // role IDs
    namingPattern:   { type: String,   default: "ticket-{number}" }, // {number}, {username}
    channelCategory: { type: String,   default: null  }, // Discord category ID
    color:           { type: String,   default: "#5865F2" },
    questions:       { type: [formQuestionSchema], default: [] },
    // Per-category auto-close override
    autoCloseTime:   { type: Number,   default: null  }, // null = use server default
    ticketCount:     { type: Number,   default: 0     }, // total tickets ever created
  },
  { timestamps: true }
);

ticketCategorySchema.index({ guildId: 1, name: 1 }, { unique: true });

function fromConnection(connection) {
  if (connection.models["TicketCategory"]) return connection.models["TicketCategory"];
  return connection.model("TicketCategory", ticketCategorySchema);
}

module.exports = { fromConnection };
