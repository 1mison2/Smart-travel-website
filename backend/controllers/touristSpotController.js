const mongoose = require("mongoose");
const TouristSpot = require("../models/TouristSpot");

exports.createTouristSpot = async (req, res) => {
  try {
    const {
      name,
      location,
      description,
      category,
      estimatedCost,
      estimatedTime,
      imageUrl,
    } = req.body;

    if (!name || !location || !category) {
      return res.status(400).json({ message: "Name, location, and category are required" });
    }

    const spot = await TouristSpot.create({
      name,
      location,
      description,
      category,
      estimatedCost,
      estimatedTime,
      imageUrl,
      createdBy: req.user._id,
    });

    res.status(201).json(spot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAllTouristSpots = async (_req, res) => {
  try {
    const spots = await TouristSpot.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email");

    res.json(spots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getTouristSpotById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid tourist spot id" });
    }

    const spot = await TouristSpot.findById(id).populate("createdBy", "name email");
    if (!spot) {
      return res.status(404).json({ message: "Tourist spot not found" });
    }

    res.json(spot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
