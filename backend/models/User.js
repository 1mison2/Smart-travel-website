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
    required: function passwordRequired() {
      return this.authProvider !== "google";
    }
  },
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local"
  },
  googleId: {
    type: String,
    sparse: true
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
  phone: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  bio: {
    type: String,
    default: ""
  },
  birthDate: {
    type: Date
  },
  languages: {
    type: [String],
    default: []
  },
  preferences: {
    budget: { type: String, default: "" },
    travelStyle: { type: String, default: "" },
    accommodation: { type: String, default: "" },
    interests: { type: [String], default: [] }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    tripReminders: { type: Boolean, default: true },
    priceAlerts: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: true }
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
