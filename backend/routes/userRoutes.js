const express = require('express');
const {
  getStats,
  getRecentTrips,
  createTrip,
  updateProfile,
  updatePassword,
} = require('../controllers/userController');
const {
  getTravelers,
  getTravelerProfile,
  toggleFollowTraveler,
} = require('../controllers/communityController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/stats', protect, getStats);
router.get('/recent-trips', protect, getRecentTrips);
router.post('/trips', protect, createTrip);
router.get('/travelers', protect, getTravelers);
router.get('/travelers/:id', protect, getTravelerProfile);
router.post('/travelers/:id/follow', protect, toggleFollowTraveler);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);

module.exports = router;
