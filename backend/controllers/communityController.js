const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const Post = require("../models/Post");
const Review = require("../models/Review");
const SavedPost = require("../models/SavedPost");
const User = require("../models/User");
const TravelPlan = require("../models/TravelPlan");
const ChatRoom = require("../models/ChatRoom");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeText = (value, max = 4000) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const normalizeList = (value) =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : String(value || "").split(","))
        .map((item) => sanitizeText(item, 40).toLowerCase())
        .filter(Boolean)
    )
  );

const toIdMap = (rows, field = "_id") =>
  new Map(rows.map((item) => [String(item[field]), item.count]));

const buildTravelerCard = (user, currentUserId, stats = {}) => {
  const raw = user.toObject ? user.toObject() : user;
  const followers = Array.isArray(raw.followers) ? raw.followers : [];
  const following = Array.isArray(raw.following) ? raw.following : [];
  return {
    ...raw,
    postsCount: stats.postsCount || 0,
    travelPlansCount: stats.travelPlansCount || 0,
    reviewsCount: stats.reviewsCount || 0,
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing: followers.some((id) => String(id) === String(currentUserId)),
  };
};

const decoratePosts = async (posts, currentUserId) => {
  const postIds = posts.map((post) => post._id);
  const [commentsCount, savedRows] = await Promise.all([
    Comment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: "$postId", count: { $sum: 1 } } },
    ]),
    SavedPost.find({ userId: currentUserId, postId: { $in: postIds } }).select("postId").lean(),
  ]);
  const commentCountMap = new Map(commentsCount.map((item) => [String(item._id), item.count]));
  const savedSet = new Set(savedRows.map((item) => String(item.postId)));

  return posts.map((post) => {
    const raw = post.toObject ? post.toObject() : post;
    return {
      ...raw,
      likesCount: Array.isArray(raw.likes) ? raw.likes.length : 0,
      commentsCount: commentCountMap.get(String(raw._id)) || 0,
      isLiked: Array.isArray(raw.likes) ? raw.likes.some((id) => String(id) === String(currentUserId)) : false,
      isSaved: savedSet.has(String(raw._id)),
    };
  });
};

exports.createPost = async (req, res) => {
  try {
    const { title, content, destination, tags, type } = req.body || {};
    const images = Array.isArray(req.files)
      ? req.files.map((file) => `${req.protocol}://${req.get("host")}/uploads/${file.filename}`)
      : [];

    if (!content) return res.status(400).json({ message: "content is required" });

    const post = await Post.create({
      userId: req.user._id,
      type: ["blog", "trip_post"].includes(String(type || "").trim()) ? String(type).trim() : "blog",
      title: sanitizeText(title, 180),
      content: sanitizeText(content, 8000),
      destination: sanitizeText(destination, 120),
      tags: normalizeList(tags),
      images,
      status: "approved",
    });

    const populated = await Post.findById(post._id).populate("userId", "name email profilePicture");
    return res.status(201).json({ message: "Post created", post: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create post" });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { destination = "", tag = "", sort = "latest", mine = "false", status, type = "", authorId, feed = "discover" } = req.query;
    const query = {};
    if (mine === "true") query.userId = req.user._id;
    else if (authorId && isValidObjectId(authorId)) query.userId = authorId;
    else if (feed === "following") {
      const followingIds = Array.isArray(req.user.following) ? req.user.following : [];
      query.userId = followingIds.length ? { $in: followingIds } : { $in: [] };
    }
    if (destination) query.destination = { $regex: sanitizeText(destination, 120), $options: "i" };
    if (tag) query.tags = sanitizeText(tag, 40).toLowerCase();
    if (type && ["blog", "trip_post"].includes(String(type))) query.type = String(type);
    if (status && req.user.role === "admin") query.status = status;
    else if (mine !== "true") query.status = "approved";

    let posts = await Post.find(query)
      .populate("userId", "name email profilePicture bio location interests travelStyle followers following")
      .sort({ createdAt: -1 })
      .limit(80);
    posts = await decoratePosts(posts, req.user._id);

    if (sort === "trending") {
      posts = posts.sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount));
    }

    return res.json({ posts, total: posts.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
};

exports.getPostById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid post id" });
    const post = await Post.findById(req.params.id).populate("userId", "name email profilePicture");
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.status !== "approved" && post.userId._id.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You cannot view this post yet" });
    }
    const [decorated] = await decoratePosts([post], req.user._id);
    return res.json({ post: decorated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch post" });
  }
};

exports.deletePost = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid post id" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only delete your own posts" });
    }
    await Promise.all([
      post.deleteOne(),
      Comment.deleteMany({ postId: post._id }),
      SavedPost.deleteMany({ postId: post._id }),
    ]);
    return res.json({ message: "Post deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete post" });
  }
};

exports.togglePostLike = async (req, res) => {
  try {
    const { postId } = req.body || {};
    if (!postId || !isValidObjectId(postId)) return res.status(400).json({ message: "Valid postId is required" });
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const existing = post.likes.findIndex((id) => String(id) === String(req.user._id));
    if (existing >= 0) post.likes.splice(existing, 1);
    else post.likes.push(req.user._id);
    await post.save();

    return res.json({
      message: existing >= 0 ? "Like removed" : "Post liked",
      likesCount: post.likes.length,
      isLiked: existing < 0,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update post like" });
  }
};

exports.toggleSavedPost = async (req, res) => {
  try {
    const { postId } = req.body || {};
    if (!postId || !isValidObjectId(postId)) return res.status(400).json({ message: "Valid postId is required" });
    const existing = await SavedPost.findOne({ userId: req.user._id, postId });
    if (existing) {
      await existing.deleteOne();
      return res.json({ message: "Post removed from saved", isSaved: false });
    }
    await SavedPost.create({ userId: req.user._id, postId });
    return res.json({ message: "Post saved", isSaved: true });
  } catch (err) {
    if (err?.code === 11000) return res.json({ message: "Post saved", isSaved: true });
    console.error(err);
    return res.status(500).json({ message: "Failed to update saved post" });
  }
};

exports.getSavedPosts = async (req, res) => {
  try {
    const savedRows = await SavedPost.find({ userId: req.user._id }).populate({
      path: "postId",
      populate: { path: "userId", select: "name email profilePicture" },
    });
    const posts = savedRows.map((row) => row.postId).filter(Boolean);
    const decorated = await decoratePosts(posts, req.user._id);
    return res.json({ posts: decorated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch saved posts" });
  }
};

exports.createComment = async (req, res) => {
  try {
    const { postId, comment } = req.body || {};
    if (!postId || !comment || !isValidObjectId(postId)) {
      return res.status(400).json({ message: "postId and comment are required" });
    }
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });
    const createdComment = await Comment.create({
      postId,
      userId: req.user._id,
      comment: sanitizeText(comment, 1000),
    });
    const populated = await Comment.findById(createdComment._id).populate("userId", "name email profilePicture");
    return res.status(201).json({ message: "Comment added", comment: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to add comment" });
  }
};

exports.getCommentsForPost = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.postId)) return res.status(400).json({ message: "Invalid post id" });
    const comments = await Comment.find({ postId: req.params.postId })
      .populate("userId", "name email profilePicture")
      .sort({ createdAt: 1 });
    return res.json({ comments });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch comments" });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { destination, rating, reviewText, images } = req.body || {};
    const numericRating = Number(rating);
    if (!destination || Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5 || !reviewText) {
      return res.status(400).json({ message: "destination, rating (1-5), and reviewText are required" });
    }
    const review = await Review.create({
      userId: req.user._id,
      destination: sanitizeText(destination, 120),
      rating: numericRating,
      reviewText: sanitizeText(reviewText, 1500),
      images: normalizeList(images).slice(0, 6),
      status: "approved",
    });
    const populated = await Review.findById(review._id).populate("userId", "name email profilePicture");
    return res.status(201).json({ message: "Review created", review: populated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create review" });
  }
};

exports.getReviewsByDestination = async (req, res) => {
  try {
    const destination = sanitizeText(req.params.destination, 120);
    const query = {
      destination: { $regex: `^${destination}$`, $options: "i" },
      status: "approved",
    };
    const reviews = await Review.find(query)
      .populate("userId", "name email profilePicture")
      .sort({ createdAt: -1 });
    const averageRating = reviews.length
      ? Number((reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length).toFixed(1))
      : 0;
    return res.json({ destination, averageRating, reviews, total: reviews.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

exports.getTravelers = async (req, res) => {
  try {
    const { q = "", interest = "" } = req.query;
    const query = {
      _id: { $ne: req.user._id },
      role: { $ne: "admin" },
      isBlocked: false,
    };
    const sanitizedQuery = sanitizeText(q, 80);
    const sanitizedInterest = sanitizeText(interest, 40).toLowerCase();

    if (sanitizedQuery) {
      query.$or = [
        { name: { $regex: sanitizedQuery, $options: "i" } },
        { location: { $regex: sanitizedQuery, $options: "i" } },
        { bio: { $regex: sanitizedQuery, $options: "i" } },
      ];
    }
    if (sanitizedInterest) {
      query.interests = sanitizedInterest;
    }

    const users = await User.find(query)
      .select("name email profilePicture bio location interests travelStyle languages followers following createdAt")
      .sort({ createdAt: -1 })
      .limit(36);

    const userIds = users.map((user) => user._id);
    const [postCounts, planCounts, reviewCounts] = await Promise.all([
      Post.aggregate([
        { $match: { userId: { $in: userIds }, status: "approved" } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      TravelPlan.aggregate([
        { $match: { userId: { $in: userIds } } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
      Review.aggregate([
        { $match: { userId: { $in: userIds }, status: "approved" } },
        { $group: { _id: "$userId", count: { $sum: 1 } } },
      ]),
    ]);

    const postCountMap = toIdMap(postCounts);
    const planCountMap = toIdMap(planCounts);
    const reviewCountMap = toIdMap(reviewCounts);

    const travelers = users
      .map((user) =>
        buildTravelerCard(user, req.user._id, {
          postsCount: postCountMap.get(String(user._id)) || 0,
          travelPlansCount: planCountMap.get(String(user._id)) || 0,
          reviewsCount: reviewCountMap.get(String(user._id)) || 0,
        })
      )
      .sort((a, b) => {
        const scoreA = (a.followersCount || 0) * 4 + (a.postsCount || 0) * 2 + (a.travelPlansCount || 0);
        const scoreB = (b.followersCount || 0) * 4 + (b.postsCount || 0) * 2 + (b.travelPlansCount || 0);
        return scoreB - scoreA;
      });

    return res.json({ travelers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch travelers" });
  }
};

exports.getTravelerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid traveler id" });

    const traveler = await User.findById(id)
      .select("name email profilePicture bio location interests travelStyle languages followers following createdAt");
    if (!traveler || traveler.role === "admin" || traveler.isBlocked) {
      return res.status(404).json({ message: "Traveler not found" });
    }

    const [posts, travelPlans, reviews, chatRoom] = await Promise.all([
      Post.find({ userId: id, status: "approved" })
        .populate("userId", "name email profilePicture bio location interests travelStyle followers following")
        .sort({ createdAt: -1 })
        .limit(12),
      TravelPlan.find({ userId: id }).sort({ startDate: 1, createdAt: -1 }).limit(8),
      Review.find({ userId: id, status: "approved" }).sort({ createdAt: -1 }).limit(6),
      ChatRoom.findOne({ participants: { $all: [req.user._id, id] } })
        .populate("travelPlanId", "destination startDate endDate"),
    ]);

    const decoratedPosts = await decoratePosts(posts, req.user._id);
    const profile = buildTravelerCard(traveler, req.user._id, {
      postsCount: decoratedPosts.length,
      travelPlansCount: travelPlans.length,
      reviewsCount: reviews.length,
    });

    return res.json({
      traveler: profile,
      posts: decoratedPosts,
      travelPlans,
      reviews,
      chatRoom,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to fetch traveler profile" });
  }
};

exports.toggleFollowTraveler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid traveler id" });
    if (String(id) === String(req.user._id)) return res.status(400).json({ message: "You cannot follow yourself" });

    const [viewer, traveler] = await Promise.all([
      User.findById(req.user._id),
      User.findById(id),
    ]);
    if (!viewer || !traveler || traveler.role === "admin" || traveler.isBlocked) {
      return res.status(404).json({ message: "Traveler not found" });
    }

    const viewerFollowing = new Set((viewer.following || []).map((item) => String(item)));
    const travelerFollowers = new Set((traveler.followers || []).map((item) => String(item)));
    const alreadyFollowing = viewerFollowing.has(String(id));

    if (alreadyFollowing) {
      viewerFollowing.delete(String(id));
      travelerFollowers.delete(String(req.user._id));
    } else {
      viewerFollowing.add(String(id));
      travelerFollowers.add(String(req.user._id));
    }

    viewer.following = Array.from(viewerFollowing);
    traveler.followers = Array.from(travelerFollowers);
    await Promise.all([viewer.save(), traveler.save()]);

    return res.json({
      message: alreadyFollowing ? "Traveler unfollowed" : "Traveler followed",
      isFollowing: !alreadyFollowing,
      followersCount: traveler.followers.length,
      followingCount: viewer.following.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to update follow state" });
  }
};
