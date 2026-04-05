const Trip = require('../models/Trip');
const Itinerary = require('../models/Itinerary');
const User = require("../models/User");
const bcrypt = require("bcryptjs");

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

    const mappedTrips = trips.map((trip) => ({
      ...trip,
      sourceType: "trip",
      displayPrice: trip.price || 0,
    }));

    const mappedItineraries = itineraries.map((itinerary) => {
      const anchorDate = itinerary.startDate ? new Date(itinerary.startDate) : new Date(itinerary.createdAt);
      const safeStartDate = Number.isNaN(anchorDate.getTime()) ? new Date() : anchorDate;
      const safeEndDate = new Date(safeStartDate);
      safeEndDate.setDate(safeStartDate.getDate() + Math.max(Number(itinerary.durationDays || 1) - 1, 0));

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
    const { title, startDate, endDate, price, summary } = req.body;
    if (!title || !startDate || !endDate) return res.status(400).json({ message: 'Missing required fields' });
    const trip = await Trip.create({ user: userId, title, startDate, endDate, price: price || 0, summary });
    res.status(201).json({ trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
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
