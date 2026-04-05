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
  profilePicture: {
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
  interests: {
    type: [String],
    default: []
  },
  followers: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    default: []
  },
  following: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    default: []
  },
  travelStyle: {
    type: String,
    default: ""
  },
  savedLocations: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Location"
      }
    ],
    default: []
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

UserSchema.pre("save", function syncTravelProfile(next) {
  if ((!this.travelStyle || !this.travelStyle.trim()) && this.preferences?.travelStyle) {
    this.travelStyle = this.preferences.travelStyle;
  }
  if ((!this.interests || this.interests.length === 0) && Array.isArray(this.preferences?.interests)) {
    this.interests = this.preferences.interests;
  }
  next();
});

module.exports = mongoose.model("User", UserSchema);
