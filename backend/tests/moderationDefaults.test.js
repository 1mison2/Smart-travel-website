const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Post = require("../models/Post");
const Review = require("../models/Review");

test("new community posts default to pending moderation", () => {
  const post = new Post({
    userId: new mongoose.Types.ObjectId(),
    content: "Testing a moderation-ready post",
  });

  assert.equal(post.status, "pending");
});

test("new destination reviews default to pending moderation", () => {
  const review = new Review({
    userId: new mongoose.Types.ObjectId(),
    destination: "Pokhara",
    rating: 5,
    reviewText: "Great place for a weekend trip.",
  });

  assert.equal(review.status, "pending");
});
