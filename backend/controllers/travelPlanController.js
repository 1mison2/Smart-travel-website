const mongoose = require("mongoose");
const TravelPlan = require("../models/TravelPlan");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeText = (value, max = 1200) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const normalizeInterests = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value || "").split(","))
        .map((item) => sanitizeText(item, 40).toLowerCase())
        .filter(Boolean)
    )
  );

exports.createTravelPlan = async (req, res) => {
  try {
    const { title, destination, startDate, endDate, budget, travelStyle, interests, description } = req.body || {};
    if (!destination || !startDate || !endDate || budget === undefined) {
      return res.status(400).json({ message: "destination, startDate, endDate, and budget are required" });
    }

    const numericBudget = Number(budget);
    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);
    if (
      Number.isNaN(numericBudget) ||
      numericBudget < 0 ||
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime()) ||
      parsedEndDate < parsedStartDate
    ) {
      return res.status(400).json({ message: "Invalid travel plan details" });
    }

    const travelPlan = await TravelPlan.create({
      userId: req.user._id,
      title: sanitizeText(title, 180),
      destination: sanitizeText(destination, 120),
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      budget: numericBudget,
      budgetRangeLabel: numericBudget <= 15000 ? "Budget" : numericBudget <= 50000 ? "Mid-range" : "Premium",
      travelStyle: sanitizeText(travelStyle, 40),
      interests: normalizeInterests(interests),
      description: sanitizeText(description, 1200),
    });

    const populated = await TravelPlan.findById(travelPlan._id).populate(
      "userId",
      "name email profilePicture bio interests travelStyle preferences"
    );
    return res.status(201).json({ message: "Travel plan created", travelPlan: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create travel plan" });
  }
};

exports.getTravelPlans = async (req, res) => {
  try {
    const {
      destination = "",
      startDate,
      endDate,
      minBudget,
      maxBudget,
      interests = "",
      mine = "false",
    } = req.query;

    const query = {};
    if (mine === "true") query.userId = req.user._id;
    if (destination) query.destination = { $regex: sanitizeText(destination, 120), $options: "i" };
    if (minBudget || maxBudget) {
      query.budget = {};
      if (minBudget) query.budget.$gte = Number(minBudget);
      if (maxBudget) query.budget.$lte = Number(maxBudget);
    }
    if (startDate || endDate) {
      query.$and = [];
      if (startDate) query.$and.push({ endDate: { $gte: new Date(startDate) } });
      if (endDate) query.$and.push({ startDate: { $lte: new Date(endDate) } });
    }
    const normalizedInterests = normalizeInterests(interests);
    if (normalizedInterests.length) query.interests = { $in: normalizedInterests };

    const travelPlans = await TravelPlan.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email profilePicture bio interests travelStyle preferences");

    return res.json({ travelPlans, total: travelPlans.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch travel plans" });
  }
};

exports.getTravelPlanById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid travel plan id" });
    const travelPlan = await TravelPlan.findById(req.params.id).populate(
      "userId",
      "name email profilePicture bio interests travelStyle preferences"
    );
    if (!travelPlan) return res.status(404).json({ message: "Travel plan not found" });
    return res.json({ travelPlan });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch travel plan" });
  }
};

exports.deleteTravelPlan = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid travel plan id" });
    const travelPlan = await TravelPlan.findById(req.params.id);
    if (!travelPlan) return res.status(404).json({ message: "Travel plan not found" });
    if (travelPlan.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own travel plans" });
    }
    await travelPlan.deleteOne();
    return res.json({ message: "Travel plan deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete travel plan" });
  }
};
