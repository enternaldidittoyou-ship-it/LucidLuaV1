const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: { type: String, default: "user" }, // admin | reseller | user
  balance: { type: Number, default: 0 }
});

module.exports = mongoose.model("User", userSchema);