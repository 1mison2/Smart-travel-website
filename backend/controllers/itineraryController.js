const Itinerary = require("../models/Itinerary");
const Location = require("../models/Location");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildDayPlan = ({ day, places, budgetPerDay }) => {
  const selected = places.slice(0, 3);
  const estimatedCost = selected.reduce((sum, place) => sum + (place.averageCost || 0), 0) || budgetPerDay;

  return {
    day,
    title: `Day ${day} plan`,
    places: selected.map((place) => ({
      placeId: place._id,
      name: place.name,
      category: place.category || "attraction",
      image: place.image || "",
      estimatedCost: place.averageCost || Math.round(budgetPerDay / 3),
      notes: [place.district, place.province].filter(Boolean).join(", "),
    })),
    estimatedCost,
    notes: `Keep ${Math.round(Math.max(0, budgetPerDay - estimatedCost))} NPR as flexible budget for meals and transport.`,
  };
};

exports.generateItinerary = async (req, res) => {
  try {
    const {
      destination,
      budget,
      durationDays,
      interests = [],
      startDate,
    } = req.body || {};

    if (!destination || budget === undefined || !durationDays) {
      return res.status(400).json({ message: "destination, budget, and durationDays are required" });
    }

    const numericBudget = Number(budget);
    const numericDays = clamp(Number(durationDays), 1, 14);
    if (Number.isNaN(numericBudget) || Number.isNaN(numericDays) || numericBudget < 0) {
      return res.status(400).json({ message: "Invalid budget or durationDays" });
    }

    const queryWords = String(destination)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5);

    const locationCandidates = await Location.find({
      $or: [
        { name: { $regex: String(destination), $options: "i" } },
        { district: { $regex: String(destination), $options: "i" } },
        { province: { $regex: String(destination), $options: "i" } },
        ...queryWords.map((word) => ({ description: { $regex: word, $options: "i" } })),
        ...queryWords.map((word) => ({ category: { $regex: word, $options: "i" } })),
      ],
    })
      .sort({ averageCost: 1, createdAt: -1 })
      .limit(50)
      .lean();

    const interestSet = new Set((Array.isArray(interests) ? interests : [interests]).map((i) => String(i).toLowerCase()));
    const scored = locationCandidates
      .map((place) => {
        const text = [place.name, place.category, place.description].filter(Boolean).join(" ").toLowerCase();
        let score = 0;
        for (const interest of interestSet) {
          if (interest && text.includes(interest)) score += 2;
        }
        if (text.includes(String(destination).toLowerCase())) score += 3;
        return { ...place, score };
      })
      .sort((a, b) => b.score - a.score || a.averageCost - b.averageCost);

    const budgetPerDay = numericDays > 0 ? Math.round(numericBudget / numericDays) : numericBudget;
    const days = [];
    for (let day = 1; day <= numericDays; day += 1) {
      const offset = (day - 1) * 3;
      const slice = scored.slice(offset, offset + 6);
      days.push(buildDayPlan({ day, places: slice, budgetPerDay }));
    }

    const totalEstimatedCost = days.reduce((sum, day) => sum + day.estimatedCost, 0);
    const itinerary = await Itinerary.create({
      userId: req.user._id,
      destination: String(destination).trim(),
      durationDays: numericDays,
      budget: numericBudget,
      interests: Array.isArray(interests) ? interests : [interests],
      startDate: startDate ? new Date(startDate) : undefined,
      days,
      totalEstimatedCost,
      source: "rule_based",
    });

    res.status(201).json({
      itinerary,
      summary: {
        destination: itinerary.destination,
        durationDays: itinerary.durationDays,
        totalEstimatedCost: itinerary.totalEstimatedCost,
        budget: itinerary.budget,
        budgetGap: itinerary.budget - itinerary.totalEstimatedCost,
      },
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
