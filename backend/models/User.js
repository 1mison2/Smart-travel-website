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
    enum: ["user", "admin", "traveler"],
    default: "user"
  },
  isBlocked: {
    type: Boolean,
    default: false
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
