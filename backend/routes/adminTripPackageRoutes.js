const express = require("express");
const {
  getAllTripPackages,
  getTripPackageById,
  createTripPackage,
  updateTripPackage,
  deleteTripPackage,
} = require("../controllers/adminTripPackageController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(verifyToken, isAdmin);

router.get("/", getAllTripPackages);
router.get("/:id", getTripPackageById);
router.post("/", createTripPackage);
router.put("/:id", updateTripPackage);
router.delete("/:id", deleteTripPackage);

module.exports = router;
