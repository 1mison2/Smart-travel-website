const Trip = require('../models/Trip');

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
    const trips = await Trip.find({ user: userId }).sort({ startDate: -1 }).limit(6).lean();
    res.json({ trips });
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