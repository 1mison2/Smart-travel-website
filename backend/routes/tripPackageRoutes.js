const express = require("express");
const {
  getTripPackages,
  getTripPackageById,
  bookTripPackage,
} = require("../controllers/tripPackageController");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getTripPackages);
router.get("/:id", getTripPackageById);
router.post("/:id/book", verifyToken, bookTripPackage);

module.exports = router;
