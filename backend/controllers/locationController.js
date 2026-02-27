const Location = require("../models/Location");
const mongoose = require("mongoose");

exports.getPublicLocations = async (_req, res) => {
  try {
    const locations = await Location.find().sort({ createdAt: -1 });
    res.json(locations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch locations" });
  }
};

exports.getPublicLocationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const location = await Location.findById(id);
    if (!location) return res.status(404).json({ message: "Location not found" });

    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch location details" });
  }
};
