const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["traveler", "admin"],
    default: "traveler"
  },
  resetPasswordToken: {
    type: String,
    select: false // Don't include in queries by default
  },
  resetPasswordExpire: {
    type: Date,
    select: false // Don't include in queries by default
  }
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
