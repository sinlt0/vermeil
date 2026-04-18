// ============================================================
//  models/VerificationConfig.js
//  Per-guild verification configuration
// ============================================================
const mongoose = require("mongoose");

const verificationConfigSchema = new mongoose.Schema(
  {
    guildId:        { type: String,  required: true, unique: true },
    enabled:        { type: Boolean, default: false  },
    verifiedRoleId: { type: String,  default: null   }, // role given after verify
    unverifiedRoleId:{ type: String, default: null   }, // role given on join
    channelId:      { type: String,  default: null   }, // verification channel
    messageId:      { type: String,  default: null   }, // embed message ID
    type:           { type: String,  enum: ["oneclick", "captcha"], default: "oneclick" },
    retryLimit:     { type: Number,  default: 3      }, // max captcha attempts
    imageUrl:       { type: String,  default: null   }, // custom image, null = canvas
  },
  { timestamps: true }
);

function fromConnection(connection) {
  if (connection.models["VerificationConfig"]) return connection.models["VerificationConfig"];
  return connection.model("VerificationConfig", verificationConfigSchema);
}

module.exports = { fromConnection };
