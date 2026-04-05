const Location = require("../models/Location");
const mongoose = require("mongoose");
const User = require("../models/User");

exports.getPublicLocations = async (_req, res) => {
  try {
    const locations = await Location.find()
      .populate("parentLocationId", "name district province category")
      .sort({ createdAt: -1 });
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

    const location = await Location.findById(id).populate(
      "parentLocationId",
      "name district province category"
    );
    if (!location) return res.status(404).json({ message: "Location not found" });

    res.json(location);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch location details" });
  }
};

exports.getSavedLocations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedLocations",
      options: { sort: { createdAt: -1 } },
    });

    res.json({ savedLocations: user?.savedLocations || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch saved locations" });
  }
};

exports.saveLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const location = await Location.findById(id).select("_id");
    if (!location) {
      return res.status(404).json({ message: "Location not found" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { savedLocations: id } },
      { new: true }
    ).populate({
      path: "savedLocations",
      options: { sort: { createdAt: -1 } },
    });

    res.json({
      message: "Location saved",
      savedLocations: user?.savedLocations || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save location" });
  }
};

exports.removeSavedLocation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid location id" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { savedLocations: id } },
      { new: true }
    ).populate({
      path: "savedLocations",
      options: { sort: { createdAt: -1 } },
    });

    res.json({
      message: "Location removed from saved places",
      savedLocations: user?.savedLocations || [],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update saved locations" });
  }
};
