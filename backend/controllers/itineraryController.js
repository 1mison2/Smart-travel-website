const Itinerary = require("../models/Itinerary");
const Location = require("../models/Location");
const {
  clamp,
  normalizeText,
  normalizeList,
  getMinimumBudget,
  createItineraryAlternatives,
} = require("../utils/itineraryPlanner");

exports.generateItinerary = async (req, res) => {
  try {
    const {
      destination,
      budget,
      durationDays,
      interests = [],
      startDate,
      pace = "balanced",
      tripStyle = "balanced",
      companionType = "solo",
    } = req.body || {};

    if (!destination || budget === undefined || !durationDays) {
      return res.status(400).json({ message: "destination, budget, and durationDays are required" });
    }

    const normalizedDestination = normalizeText(destination);
    const numericBudget = Number(budget);
    const numericDays = clamp(Number(durationDays), 1, 14);
    const normalizedInterests = normalizeList(interests);
    const normalizedCompanionType = normalizeText(companionType).toLowerCase();

    if (Number.isNaN(numericBudget) || Number.isNaN(numericDays) || numericBudget < 0) {
      return res.status(400).json({ message: "Invalid budget or durationDays" });
    }

    const minimumBudget = getMinimumBudget({ destination: normalizedDestination, durationDays: numericDays });
    if (numericBudget < minimumBudget) {
      return res.status(400).json({
        message: `Budget is too low for this plan. Use at least NPR ${minimumBudget.toLocaleString()} for ${normalizedDestination || "this destination"}.`,
      });
    }

    const queryWords = normalizedDestination
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5);

    const locationCandidates = await Location.find({
      $or: [
        { name: { $regex: normalizedDestination, $options: "i" } },
        { district: { $regex: normalizedDestination, $options: "i" } },
        { province: { $regex: normalizedDestination, $options: "i" } },
        ...queryWords.map((word) => ({ description: { $regex: word, $options: "i" } })),
        ...queryWords.map((word) => ({ category: { $regex: word, $options: "i" } })),
      ],
    })
      .sort({ averageCost: 1, createdAt: -1 })
      .limit(80)
      .lean();

    const alternatives = createItineraryAlternatives({
      locationCandidates,
      destination: normalizedDestination,
      budget: numericBudget,
      durationDays: numericDays,
      interests: normalizedInterests,
      startDate,
      pace: normalizeText(pace).toLowerCase(),
      tripStyle: normalizeText(tripStyle).toLowerCase(),
      companionType: normalizedCompanionType,
    });

    const primaryOption = alternatives.find((item) => item.isRecommended) || alternatives[0];
    const itinerary = await Itinerary.create({
      userId: req.user._id,
      destination: normalizedDestination,
      durationDays: numericDays,
      budget: numericBudget,
      interests: primaryOption?.interests || normalizedInterests,
      startDate: startDate ? new Date(startDate) : undefined,
      days: primaryOption?.days || [],
      totalEstimatedCost: primaryOption?.totalEstimatedCost || 0,
      source: "rule_based",
    });

    const serializedAlternatives = alternatives.map((option) => ({
      key: option.key,
      label: option.label,
      description: option.description,
      isRecommended: option.isRecommended,
      itinerary: option.isRecommended ? itinerary : { ...option, _id: null },
      summary: option.summary,
    }));

    res.status(201).json({
      itinerary,
      summary: primaryOption?.summary || null,
      alternatives: serializedAlternatives,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate itinerary" });
  }
};

exports.getMyItineraries = async (req, res) => {
  try {
    const itineraries = await Itinerary.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ itineraries });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch itineraries" });
  }
};

exports.getItineraryById = async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({ _id: req.params.id, userId: req.user._id });
    if (!itinerary) return res.status(404).json({ message: "Itinerary not found" });
    res.json({ itinerary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch itinerary" });
  }
};

exports.deleteItinerary = async (req, res) => {
  try {
    const deleted = await Itinerary.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ message: "Itinerary not found" });
    res.json({ message: "Itinerary deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete itinerary" });
  }
};
