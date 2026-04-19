// ============================================================
//  models/LogConfig.js
//  Per-guild logging configuration
//  One webhook per channel, multiple categories can share
// ============================================================
const mongoose = require("mongoose");

const webhookSchema = new mongoose.Schema({
  channelId:  { type: String, required: true },
  webhookId:  { type: String, required: true },
  webhookToken: { type: String, required: true },
}, { _id: false });

const categorySchema = new mongoose.Schema({
  enabled:   { type: Boolean, default: true  },
  channelId: { type: String,  default: null  },
  webhook:   { type: webhookSchema, default: null },
}, { _id: false });

const logConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },

  // One entry per unique channel to avoid duplicate webhooks
  // Map of channelId → { webhookId, webhookToken }
  webhooks: { type: Map, of: webhookSchema, default: {} },

  categories: {
    mod:       { type: categorySchema, default: () => ({}) },
    antinuke:  { type: categorySchema, default: () => ({}) },
    automod:   { type: categorySchema, default: () => ({}) },
    member:    { type: categorySchema, default: () => ({}) },
    message:   { type: categorySchema, default: () => ({}) },
    server:    { type: categorySchema, default: () => ({}) },
    voice:     { type: categorySchema, default: () => ({}) },
    invite:    { type: categorySchema, default: () => ({}) },
    thread:    { type: categorySchema, default: () => ({}) },
    webhook:   { type: categorySchema, default: () => ({}) },
    emoji:     { type: categorySchema, default: () => ({}) },
    boost:     { type: categorySchema, default: () => ({}) },
  },

}, { timestamps: true });

function fromConnection(connection) {
  if (connection.models["LogConfig"]) return connection.models["LogConfig"];
  return connection.model("LogConfig", logConfigSchema);
}

module.exports = { fromConnection };
