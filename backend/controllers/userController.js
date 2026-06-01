const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceKm = (from, to) => {
  const fromLat = Number(from?.latitude);
  const fromLng = Number(from?.longitude);
  const toLat = Number(to?.latitude);
  const toLng = Number(to?.longitude);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return 0;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const summarizeItineraryRoute = (days = []) => {
  const places = days.flatMap((day) => (Array.isArray(day?.places) ? day.places : []));
  const uniqueStops = Array.from(
    new Map(
      places
        .filter((place) => place?.name)
        .map((place) => [String(place.name).toLowerCase(), { name: place.name, category: place.category || "" }])
    ).values()
  );

  const totalDistanceKm = places.reduce((sum, place, index) => {
    if (index === 0) return 0;
    return sum + calculateDistanceKm(places[index - 1], place);
  }, 0);

  return {
    stopCount: uniqueStops.length,
    stopsPreview: uniqueStops.slice(0, 4).map((place) => place.name),
    categories: Array.from(
      new Set(uniqueStops.map((place) => String(place.category || "").trim()).filter(Boolean))
    ).slice(0, 4),
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
  };
};

const buildMapUri = ({ name, lat, lng }) => {
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(name))}`;
  }
  return "";
};

const sanitizeTripStops = (stops = []) =>
  (Array.isArray(stops) ? stops : [])
    .map((stop) => {
      const lat = Number(stop?.lat);
      const lng = Number(stop?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !String(stop?.name || "").trim()) return null;

      return {
        sourceId: String(stop?.sourceId || stop?.id || "").trim(),
        name: String(stop?.name || "").trim(),
        kind: String(stop?.kind || "destination").trim(),
        category: String(stop?.category || "").trim(),
        categoryLabel: String(stop?.categoryLabel || "").trim(),
        district: String(stop?.district || "").trim(),
        province: String(stop?.province || "").trim(),
        description: String(stop?.description || "").trim(),
        image: String(stop?.image || "").trim(),
        rating: Number(stop?.rating || 0),
        visitTime: String(stop?.visitTime || "").trim(),
        averageCost: Number(stop?.averageCost || 0),
        lat,
        lng,
        mapUri: String(stop?.mapUri || "").trim() || buildMapUri({ name: stop?.name, lat, lng }),
      };
    })
    .filter(Boolean);

const summarizeTripStops = (stops = []) => {
  const safeStops = sanitizeTripStops(stops);
  const categories = Array.from(
    new Set(
      safeStops
        .map((stop) => String(stop.categoryLabel || stop.category || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 6);

  const totalDistanceKm = safeStops.reduce((sum, stop, index) => {
    if (index === 0) return 0;
    return (
      sum +
      calculateDistanceKm(
        { latitude: safeStops[index - 1].lat, longitude: safeStops[index - 1].lng },
        { latitude: stop.lat, longitude: stop.lng }
      )
    );
  }, 0);

  return {
    safeStops,
    stopCount: safeStops.length,
    stopsPreview: safeStops.slice(0, 4).map((stop) => stop.name),
    categories,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
  };
};

const normalizeTrip = (trip) => ({
  ...trip,
  sourceType: "trip",
  displayPrice: Number(trip.estimatedCost || trip.price || 0),
  detailPath: trip.sourceType === "map" ? `/map-explorer?tripId=${trip._id}` : "",
  stops: Array.isArray(trip.stops) ? trip.stops : [],
  stopsPreview: Array.isArray(trip.stopsPreview) ? trip.stopsPreview : [],
  categories: Array.isArray(trip.categories) ? trip.categories : [],
  stopCount: Number(trip.stopCount || 0),
  totalDistanceKm: Number(trip.totalDistanceKm || 0),
  totalDurationSeconds: Number(trip.totalDurationSeconds || 0),
  estimatedCost: Number(trip.estimatedCost || trip.price || 0),
});

exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const now = new Date();
    const upcomingCount = await Trip.countDocuments({ user: userId, startDate: { $gte: now } });
    const totalBookings = await Trip.countDocuments({ user: userId });

    const agg = await Trip.aggregate([
      { $match: { user: userId } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const budgetUsed = agg.length ? agg[0].total : 0;

    res.json({ upcoming: upcomingCount, bookings: totalBookings, budgetUsed, buddies: 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getRecentTrips = async (req, res) => {
  try {
    const userId = req.user._id;
    const [trips, itineraries] = await Promise.all([
      Trip.find({ user: userId }).sort({ startDate: -1 }).limit(12).lean(),
      Itinerary.find({ userId }).sort({ createdAt: -1 }).limit(12).lean(),
    ]);

    const mappedTrips = trips.map(normalizeTrip);

    const mappedItineraries = itineraries.map((itinerary) => {
      const anchorDate = itinerary.startDate ? new Date(itinerary.startDate) : new Date(itinerary.createdAt);
      const safeStartDate = Number.isNaN(anchorDate.getTime()) ? new Date() : anchorDate;
      const safeEndDate = new Date(safeStartDate);
      safeEndDate.setDate(safeStartDate.getDate() + Math.max(Number(itinerary.durationDays || 1) - 1, 0));
      const routeSummary = summarizeItineraryRoute(itinerary.days);

      return {
        _id: itinerary._id,
        title: itinerary.destination || "AI itinerary",
        startDate: safeStartDate,
        endDate: safeEndDate,
        price: itinerary.totalEstimatedCost || itinerary.budget || 0,
        displayPrice: itinerary.totalEstimatedCost || itinerary.budget || 0,
        summary:
          `AI-generated ${itinerary.durationDays || 1}-day itinerary for ${itinerary.destination || "your destination"}.`,
        durationDays: itinerary.durationDays || 1,
        budget: itinerary.budget || 0,
        totalEstimatedCost: itinerary.totalEstimatedCost || 0,
        interests: Array.isArray(itinerary.interests) ? itinerary.interests : [],
        stopCount: routeSummary.stopCount,
        stopsPreview: routeSummary.stopsPreview,
        categories: routeSummary.categories,
        totalDistanceKm: routeSummary.totalDistanceKm,
        detailPath: `/itineraries/${itinerary._id}`,
        sourceType: "itinerary",
        createdAt: itinerary.createdAt,
      };
    });

    const merged = [...mappedTrips, ...mappedItineraries]
      .sort((a, b) => new Date(b.startDate || b.createdAt || 0) - new Date(a.startDate || a.createdAt || 0))
      .slice(0, 6);

    res.json({ trips: merged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createTrip = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      title,
      startDate,
      endDate,
      price,
      summary,
      destination,
      sourceType,
      travelMode,
      nearbySource,
      estimatedCost,
      totalDistanceKm,
      totalDurationSeconds,
      stops,
    } = req.body || {};
    if (!title || !startDate || !endDate) return res.status(400).json({ message: 'Missing required fields' });

    const routeSummary = summarizeTripStops(stops);
    const trip = await Trip.create({
      user: userId,
      title,
      startDate,
      endDate,
      price: Number(price || estimatedCost || 0),
      summary,
      destination: String(destination || "").trim(),
      sourceType: sourceType === "map" ? "map" : "manual",
      travelMode: String(travelMode || "").trim(),
      nearbySource: String(nearbySource || "").trim(),
      estimatedCost: Number(estimatedCost || price || 0),
      totalDistanceKm: Number(totalDistanceKm || routeSummary.totalDistanceKm || 0),
      totalDurationSeconds: Number(totalDurationSeconds || 0),
      stopCount: routeSummary.stopCount,
      stopsPreview: routeSummary.stopsPreview,
      categories: routeSummary.categories,
      stops: routeSummary.safeStops,
    });

    res.status(201).json({ trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const userId = req.user._id;
    const trip = await Trip.findOne({ _id: req.params.id, user: userId }).lean();
    if (!trip) return res.status(404).json({ message: "Trip not found" });
    res.json({ trip: normalizeTrip(trip) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  return obj;
};

const normalizeStringArray = (input) => {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || "").trim()).filter(Boolean);
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      email,
      phone,
      location,
      bio,
      birthDate,
      languages,
      preferences,
      notifications,
    } = req.body || {};

    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    if (email && String(email).toLowerCase() !== String(user.email).toLowerCase()) {
      const exists = await User.findOne({ email: String(email).toLowerCase() });
      if (exists) return res.status(400).json({ message: "Email already in use" });
      user.email = String(email).toLowerCase().trim();
    }

    if (name !== undefined) user.name = String(name || "").trim();
    if (phone !== undefined) user.phone = String(phone || "").trim();
    if (location !== undefined) user.location = String(location || "").trim();
    if (bio !== undefined) user.bio = String(bio || "").trim();
    if (birthDate !== undefined) user.birthDate = birthDate ? new Date(birthDate) : undefined;
    if (languages !== undefined) user.languages = normalizeStringArray(languages);

    if (preferences && typeof preferences === "object") {
      user.preferences = {
        budget: String(preferences.budget || user.preferences?.budget || "").trim(),
        travelStyle: String(preferences.travelStyle || user.preferences?.travelStyle || "").trim(),
        accommodation: String(preferences.accommodation || user.preferences?.accommodation || "").trim(),
        interests: normalizeStringArray(preferences.interests || user.preferences?.interests || []),
      };
    }

    if (notifications && typeof notifications === "object") {
      user.notifications = {
        emailNotifications:
          notifications.emailNotifications !== undefined
            ? Boolean(notifications.emailNotifications)
            : user.notifications?.emailNotifications ?? true,
        pushNotifications:
          notifications.pushNotifications !== undefined
            ? Boolean(notifications.pushNotifications)
            : user.notifications?.pushNotifications ?? true,
        tripReminders:
          notifications.tripReminders !== undefined
            ? Boolean(notifications.tripReminders)
            : user.notifications?.tripReminders ?? true,
        priceAlerts:
          notifications.priceAlerts !== undefined
            ? Boolean(notifications.priceAlerts)
            : user.notifications?.priceAlerts ?? false,
        newsletter:
          notifications.newsletter !== undefined
            ? Boolean(notifications.newsletter)
            : user.notifications?.newsletter ?? true,
      };
    }

    await user.save();
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.password) {
      return res.status(400).json({ message: "Password updates are not available for this account" });
    }

    const match = await bcrypt.compare(String(currentPassword), user.password);
    if (!match) return res.status(400).json({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(String(newPassword), salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
