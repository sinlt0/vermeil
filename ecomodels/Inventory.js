// ============================================================
//  ecomodels/Inventory.js
//  User item inventory — global
// ============================================================
const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  userId:   { type: String, required: true, unique: true, index: true },
  items: [{
    itemId:    { type: String, required: true },
    name:      { type: String, required: true },
    quantity:  { type: Number, default: 1, min: 0 },
    acquiredAt:{ type: Date,   default: Date.now },
  }],
}, { timestamps: true });

module.exports = inventorySchema;
