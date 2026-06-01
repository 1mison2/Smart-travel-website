const mongoose = require('mongoose');

const TripStopSchema = new mongoose.Schema({
  sourceId: { type: String, trim: true, default: "" },
  name: { type: String, trim: true, required: true },
  kind: { type: String, trim: true, default: "destination" },
  category: { type: String, trim: true, default: "" },
  categoryLabel: { type: String, trim: true, default: "" },
  district: { type: String, trim: true, default: "" },
  province: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  image: { type: String, trim: true, default: "" },
  rating: { type: Number, default: 0 },
  visitTime: { type: String, trim: true, default: "" },
  averageCost: { type: Number, default: 0 },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  mapUri: { type: String, trim: true, default: "" },
}, { _id: false });

const TripSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  price: { type: Number, default: 0 },
  summary: { type: String },
  destination: { type: String, trim: true, default: "" },
  sourceType: { type: String, enum: ["manual", "map"], default: "manual" },
  travelMode: { type: String, trim: true, default: "" },
  nearbySource: { type: String, trim: true, default: "" },
  estimatedCost: { type: Number, default: 0 },
  totalDistanceKm: { type: Number, default: 0 },
  totalDurationSeconds: { type: Number, default: 0 },
  stopCount: { type: Number, default: 0 },
  stopsPreview: { type: [String], default: [] },
  categories: { type: [String], default: [] },
  stops: { type: [TripStopSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('Trip', TripSchema);
