const mongoose = require("mongoose");
const TripPackage = require("../models/TripPackage");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizePayload = (body = {}) => ({
  title: String(body.title || "").trim(),
  description: String(body.description || "").trim(),
  location: String(body.location || "").trim(),
  startDate: body.startDate ? new Date(body.startDate) : null,
  endDate: body.endDate ? new Date(body.endDate) : null,
  basePrice: Number(body.basePrice || 0),
  currency: String(body.currency || "NPR").trim() || "NPR",
  capacity: Number(body.capacity || 1),
  coverImage: String(body.coverImage || "").trim(),
  included: Array.isArray(body.included)
    ? body.included.map((item) => String(item).trim()).filter(Boolean)
    : String(body.included || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
  addOnListings: Array.isArray(body.addOnListings)
    ? body.addOnListings
    : String(body.addOnListings || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
  isActive: typeof body.isActive === "boolean" ? body.isActive : body.isActive !== "false",
});

const validatePayload = (payload) => {
  if (!payload.title) return "Title is required";
  if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) return "Valid start date is required";
  if (!payload.endDate || Number.isNaN(payload.endDate.getTime())) return "Valid end date is required";
  if (payload.endDate < payload.startDate) return "End date must be after start date";
  if (Number.isNaN(payload.basePrice) || payload.basePrice < 0) return "Base price must be a valid number";
  if (Number.isNaN(payload.capacity) || payload.capacity < 1) return "Capacity must be at least 1";
  return "";
};

exports.getAllTripPackages = async (_req, res) => {
  try {
    const packages = await TripPackage.find()
      .sort({ createdAt: -1 })
      .populate("addOnListings", "title type pricePerUnit pricing isActive");
    res.json({ packages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trip packages" });
  }
};

exports.getTripPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const tripPackage = await TripPackage.findById(id).populate("addOnListings", "title type pricePerUnit pricing");
    if (!tripPackage) return res.status(404).json({ message: "Trip package not found" });
    res.json({ tripPackage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trip package" });
  }
};

exports.createTripPackage = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ message: error });

    const tripPackage = await TripPackage.create(payload);
    res.status(201).json({ tripPackage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create trip package" });
  }
};

exports.updateTripPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const payload = normalizePayload(req.body);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ message: error });

    const tripPackage = await TripPackage.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!tripPackage) return res.status(404).json({ message: "Trip package not found" });
    res.json({ tripPackage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update trip package" });
  }
};

exports.deleteTripPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const deleted = await TripPackage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Trip package not found" });
    res.json({ message: "Trip package deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete trip package" });
  }
};
