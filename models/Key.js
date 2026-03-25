const mongoose = require("mongoose");

const keySchema = new mongoose.Schema({
  key: String,
  expiresAt: Date,
  hwid: String,
  revoked: { type: Boolean, default: false },
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Key", keySchema);
