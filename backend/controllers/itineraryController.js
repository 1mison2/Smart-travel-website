const Itinerary = require("../models/Itinerary");
const Location = require("../models/Location");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizeText = (value) => String(value || "").trim();

const normalizeList = (items) =>
  Array.from(
    new Set(
      (Array.isArray(items) ? items : String(items || "").split(","))
        .map((item) => normalizeText(item).toLowerCase())
        .filter(Boolean)
    )
  );

const titleCase = (value) =>
  normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getMinimumBudget = ({ destination, durationDays }) => {
  const normalizedDestination = normalizeText(destination).toLowerCase();
  const dailyFloor = /(mustang|manang|dolpa|humla|muktinath)/.test(normalizedDestination) ? 5000 : 1000;
  return dailyFloor * Math.max(1, Number(durationDays) || 1);
};

const budgetBandFor = (budgetPerDay) => {
  if (budgetPerDay <= 5000) return "budget";
  if (budgetPerDay <= 14000) return "balanced";
  return "premium";
};

const fallbackDayThemes = [
  {
    arrival: "Welcome Walk",
    second: "Discovery",
    third: "nature & culture stop",
  },
  {
    arrival: "Viewpoint Circuit",
    second: "Local Food Trail",
    third: "heritage pause",
  },
  {
    arrival: "Morning Scenic Route",
    second: "Community Experience",
    third: "sunset stop",
  },
  {
    arrival: "Slow Village Walk",
    second: "Photography Session",
    third: "market and culture stop",
  },
];

const buildFallbackPlaces = ({ destination, interests, budgetPerDay, pace, day }) => {
  const interestList = Array.from(interests).filter(Boolean);
  const mainInterest = interestList[0] || "culture";
  const secondInterest = interestList[1] || "food";
  const thirdInterest = interestList[2] || "nature";
  const perPlace = Math.max(1, Math.round(budgetPerDay / 3));
  const theme = fallbackDayThemes[(Math.max(1, Number(day) || 1) - 1) % fallbackDayThemes.length];
  const paceNote =
    pace === "relaxed"
      ? "Keep the day easy with longer breaks and fewer transfers."
      : pace === "fast"
        ? "Expect a fuller day with more movement between stops."
        : "Keep the timing balanced between activities and rest.";

  return [
    {
      placeId: null,
      name: `${destination} ${theme.arrival}`,
      category: "sightseeing",
      image: "",
      estimatedCost: perPlace,
      notes: `A softer start with orientation, easy movement, and scenic grounding. ${paceNote}`,
      latitude: null,
      longitude: null,
    },
    {
      placeId: null,
      name: `${titleCase(mainInterest)} ${theme.second}`,
      category: mainInterest,
      image: "",
      estimatedCost: perPlace,
      notes: `Focused time for ${mainInterest} experiences and more destination-specific local highlights.`,
      latitude: null,
      longitude: null,
    },
    {
      placeId: null,
      name: `${destination} ${theme.third}`,
      category: secondInterest,
      image: "",
      estimatedCost: perPlace,
      notes: `Wrap up the day with a slower blend of ${secondInterest} and ${thirdInterest}.`,
      latitude: null,
      longitude: null,
    },
  ];
};

const scorePlace = ({ place, destination, interests, budgetPerDay, tripStyle, companionType }) => {
  const text = [place.name, place.category, place.description, place.district, place.province]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let score = 0;
  const destinationText = destination.toLowerCase();
  if (text.includes(destinationText)) score += 8;

  interests.forEach((interest) => {
    if (interest && text.includes(interest)) score += 4;
  });

  const averageCost = Number(place.averageCost || 0);
  if (averageCost > 0) {
    if (averageCost <= budgetPerDay * 0.55) score += 4;
    else if (averageCost <= budgetPerDay * 0.9) score += 2;
  }

  const category = String(place.category || "").toLowerCase();
  if (tripStyle === "adventure" && /(hike|trek|viewpoint|adventure|forest|mountain|wildlife)/.test(text)) score += 3;
  if (tripStyle === "culture" && /(temple|museum|heritage|culture|historic|monastery)/.test(text)) score += 3;
  if (tripStyle === "food" && /(food|cafe|restaurant|market)/.test(text)) score += 3;
  if (tripStyle === "relaxation" && /(lake|garden|sunset|boating|wellness|park)/.test(text)) score += 3;

  if (companionType === "family" && /(park|museum|lake|temple|culture|sightseeing)/.test(text)) score += 2;
  if (companionType === "solo" && /(walk|viewpoint|cafe|museum|heritage)/.test(text)) score += 2;
  if (companionType === "friends" && /(food|adventure|boating|market|night)/.test(text)) score += 2;
  if (companionType === "couple" && /(sunset|lake|viewpoint|garden|cafe)/.test(text)) score += 2;

  if (!category) score -= 1;

  return score;
};

const pickDiversePlaces = ({ scoredPlaces, desiredCount, usedPlaceIds, pace }) => {
  const targetCount = pace === "relaxed" ? Math.min(2, desiredCount) : pace === "fast" ? Math.min(4, desiredCount + 1) : desiredCount;
  const picked = [];
  const usedCategories = new Set();

  for (const place of scoredPlaces) {
    const placeKey = String(place._id || place.name || "");
    const categoryKey = String(place.category || "").toLowerCase();
    if (!placeKey || usedPlaceIds.has(placeKey)) continue;

    if (picked.length < targetCount) {
      if (!usedCategories.has(categoryKey) || picked.length >= Math.max(1, targetCount - 1)) {
        picked.push(place);
        usedPlaceIds.add(placeKey);
        if (categoryKey) usedCategories.add(categoryKey);
      }
    }

    if (picked.length >= targetCount) break;
  }

  if (picked.length < targetCount) {
    for (const place of scoredPlaces) {
      const placeKey = String(place._id || place.name || "");
      if (!placeKey || usedPlaceIds.has(placeKey)) continue;
      picked.push(place);
      usedPlaceIds.add(placeKey);
      if (picked.length >= targetCount) break;
    }
  }

  return picked;
};

const buildDayPlan = ({
  day,
  places,
  budgetPerDay,
  destination,
  interests,
  pace,
  tripStyle,
  companionType,
  startDate,
}) => {
  const useFallback = places.length === 0;
  const finalPlaces = useFallback
    ? buildFallbackPlaces({ destination, interests, budgetPerDay, pace, day })
    : places.map((place) => ({
        placeId: place._id,
        name: place.name,
        category: place.category || "attraction",
        image: place.image || "",
        estimatedCost: place.averageCost || Math.max(1, Math.round(budgetPerDay / Math.max(2, places.length))),
        notes:
          place.description ||
          [place.district, place.province].filter(Boolean).join(", ") ||
          "A worthwhile stop for this day.",
        latitude: typeof place.latitude === "number" ? place.latitude : null,
        longitude: typeof place.longitude === "number" ? place.longitude : null,
      }));

  const estimatedCost = finalPlaces.reduce((sum, place) => sum + (place.estimatedCost || 0), 0) || budgetPerDay;
  const headline = finalPlaces[0]?.name || `${destination} Highlights`;
  const travelDate = startDate ? new Date(startDate) : null;
  if (travelDate && !Number.isNaN(travelDate.getTime())) {
    travelDate.setDate(travelDate.getDate() + day - 1);
  }

  const paceMessage =
    pace === "relaxed"
      ? "This version keeps transfers lighter and leaves more room for slow moments."
      : pace === "fast"
        ? "This version packs in more movement for travelers who want a fuller day."
        : "This version balances sightseeing time with food and travel buffers.";

  const tripLens =
    tripStyle === "culture"
      ? "Priority is given to culture-rich and identity-defining stops."
      : tripStyle === "adventure"
        ? "Priority is given to outdoor and movement-heavy experiences."
        : tripStyle === "food"
          ? "Priority is given to local flavor and social stopovers."
          : tripStyle === "relaxation"
            ? "Priority is given to scenic, slower, and easy-flow places."
            : "Priority is given to a balanced spread of useful stops.";

  const companionLens =
    companionType === "family"
      ? "The day is kept family-friendly with smoother transitions."
      : companionType === "couple"
        ? "The day leans into scenic and shared moments."
        : companionType === "friends"
          ? "The day favors lively, social, and group-friendly stops."
          : companionType === "solo"
            ? "The day supports flexible pacing and solo-friendly stops."
            : "The day is structured for a general traveler.";

  return {
    day,
    title: `Day ${day}: ${headline}`,
    places: finalPlaces,
    estimatedCost,
    notes: [
      travelDate ? `Planned for ${travelDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.` : null,
      paceMessage,
      tripLens,
      companionLens,
      `Keep about ${Math.max(0, Math.round(budgetPerDay - estimatedCost))} NPR flexible for meals and local transport.`,
    ]
      .filter(Boolean)
      .join(" "),
    timeline: finalPlaces.map((place, index) => {
      const slot =
        index === 0 ? "Morning" : index === finalPlaces.length - 1 ? "Evening" : index === 1 ? "Midday" : "Afternoon";
      return {
        time: slot,
        title: place.name,
        details: place.notes,
      };
    }),
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

    const budgetPerDay = numericDays > 0 ? Math.round(numericBudget / numericDays) : numericBudget;
    const scored = locationCandidates
      .map((place) => ({
        ...place,
        plannerScore: scorePlace({
          place,
          destination: normalizedDestination,
          interests: normalizedInterests,
          budgetPerDay,
          tripStyle: normalizeText(tripStyle).toLowerCase(),
          companionType: normalizeText(companionType).toLowerCase(),
        }),
      }))
      .sort((a, b) => b.plannerScore - a.plannerScore || Number(a.averageCost || 0) - Number(b.averageCost || 0));

    const usedPlaceIds = new Set();
    const days = [];

    for (let day = 1; day <= numericDays; day += 1) {
      const dailyWindowStart = Math.max(0, (day - 1) * 4 - 2);
      const candidateWindow = scored.slice(dailyWindowStart, dailyWindowStart + 18);
      const selectedPlaces = pickDiversePlaces({
        scoredPlaces: candidateWindow,
        desiredCount: 3,
        usedPlaceIds,
        pace: normalizeText(pace).toLowerCase(),
      });

      days.push(
        buildDayPlan({
          day,
          places: selectedPlaces,
          budgetPerDay,
          destination: normalizedDestination,
          interests: normalizedInterests,
          pace: normalizeText(pace).toLowerCase(),
          tripStyle: normalizeText(tripStyle).toLowerCase(),
          companionType: normalizeText(companionType).toLowerCase(),
          startDate,
        })
      );
    }

    const totalEstimatedCost = days.reduce((sum, day) => sum + day.estimatedCost, 0);
    const itinerary = await Itinerary.create({
      userId: req.user._id,
      destination: normalizedDestination,
      durationDays: numericDays,
      budget: numericBudget,
      interests: normalizedInterests,
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
        dailyBudget: budgetPerDay,
        pace: titleCase(pace),
        tripStyle: titleCase(tripStyle),
        companionType: titleCase(companionType),
        planningMode: budgetBandFor(budgetPerDay),
        matchedLocations: scored.length,
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
