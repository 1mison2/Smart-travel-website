const Itinerary = require("../models/Itinerary");
const Location = require("../models/Location");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildFallbackPlaces = ({ destination, interests, budgetPerDay }) => {
  const interestList = Array.from(interests).filter(Boolean);
  const mainInterest = interestList[0] || "culture";
  const secondInterest = interestList[1] || "food";
  const perPlace = Math.max(1, Math.round(budgetPerDay / 3));

  return [
    {
      placeId: null,
      name: `${destination} Welcome Walk`,
      category: "sightseeing",
      image: "",
      estimatedCost: perPlace,
      notes: "Easy walk to get familiar with the area and viewpoints.",
    },
    {
      placeId: null,
      name: `${mainInterest.charAt(0).toUpperCase() + mainInterest.slice(1)} Discovery`,
      category: mainInterest,
      image: "",
      estimatedCost: perPlace,
      notes: `Focused time for ${mainInterest} experiences and local highlights.`,
    },
    {
      placeId: null,
      name: `${destination} ${secondInterest} stop`,
      category: secondInterest,
      image: "",
      estimatedCost: perPlace,
      notes: `Relax and explore ${secondInterest} options before sunset.`,
    },
  ];
};

const buildDayPlan = ({ day, places, budgetPerDay, destination, interests }) => {
  const selected = places.slice(0, 3);
  const useFallback = selected.length === 0;
  const finalPlaces = useFallback
    ? buildFallbackPlaces({ destination, interests, budgetPerDay })
    : selected.map((place) => ({
        placeId: place._id,
        name: place.name,
        category: place.category || "attraction",
        image: place.image || "",
        estimatedCost: place.averageCost || Math.round(budgetPerDay / 3),
        notes: [place.district, place.province].filter(Boolean).join(", "),
        latitude: typeof place.latitude === "number" ? place.latitude : null,
        longitude: typeof place.longitude === "number" ? place.longitude : null,
      }));

  const estimatedCost = finalPlaces.reduce((sum, place) => sum + (place.estimatedCost || 0), 0) || budgetPerDay;
  const headline = finalPlaces[0]?.name || `${destination} Highlights`;

  return {
    day,
    title: `Day ${day}: ${headline}`,
    places: finalPlaces,
    estimatedCost,
    notes: `Balance your day around ${headline}. Keep ${Math.round(Math.max(0, budgetPerDay - estimatedCost))} NPR for meals and transport.`,
    timeline: [
      {
        time: "Morning",
        title: finalPlaces[0]?.name || `${destination} Morning Start`,
        details: finalPlaces[0]?.notes || "Light exploration and orientation.",
      },
      {
        time: "Afternoon",
        title: finalPlaces[1]?.name || "Local highlights",
        details: finalPlaces[1]?.notes || "Main activities and sightseeing.",
      },
      {
        time: "Evening",
        title: finalPlaces[2]?.name || "Relax & dinner",
        details: finalPlaces[2]?.notes || "Relax and wrap up the day.",
      },
    ],
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
      days.push(buildDayPlan({
        day,
        places: slice,
        budgetPerDay,
        destination: String(destination).trim(),
        interests: interestSet,
      }));
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
