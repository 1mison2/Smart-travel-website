const express = require('express');
const { getStats, getRecentTrips, createTrip } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, getStats);
router.get('/recent-trips', protect, getRecentTrips);
router.post('/trips', protect, createTrip);

module.exports = router;