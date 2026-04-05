const express = require("express");
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const {
  createPost,
  getPosts,
  getPostById,
  deletePost,
  togglePostLike,
  toggleSavedPost,
  getSavedPosts,
} = require("../controllers/communityController");

const router = express.Router();

router.use(protect);
router.post("/create", upload.array("images", 6), createPost);
router.get("/", getPosts);
router.get("/saved", getSavedPosts);
router.get("/:id", getPostById);
router.delete("/:id", deletePost);
router.post("/like", togglePostLike);
router.post("/save", toggleSavedPost);

module.exports = router;
