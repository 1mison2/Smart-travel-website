const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createComment, getCommentsForPost } = require("../controllers/communityController");

const router = express.Router();

router.use(protect);
router.post("/create", createComment);
router.get("/:postId", getCommentsForPost);

module.exports = router;
