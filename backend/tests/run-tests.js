const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const {
  getMinimumBudget,
  createItineraryAlternatives,
} = require("../utils/itineraryPlanner");
const {
  isSingleSessionBookingType,
  calculateNights,
  buildPriceBreakdown,
} = require("../utils/bookingPricing");
const Post = require("../models/Post");
const Review = require("../models/Review");

const sampleLocations = [
  {
    _id: "loc-1",
    name: "Pokhara Lakeside",
    category: "lake cafe",
    description: "Boating, sunrise, food, and lake views",
    district: "Kaski",
    province: "Gandaki",
    averageCost: 1800,
    latitude: 28.2096,
    longitude: 83.9856,
  },
  {
    _id: "loc-2",
    name: "Sarangkot Viewpoint",
    category: "viewpoint adventure",
    description: "Sunrise hill hike and scenic mountain outlook",
    district: "Kaski",
    province: "Gandaki",
    averageCost: 1200,
    latitude: 28.242,
    longitude: 83.948,
  },
  {
    _id: "loc-3",
    name: "Old Bazaar Temple Walk",
    category: "culture temple heritage",
    description: "Historic market and temple area",
    district: "Kaski",
    province: "Gandaki",
    averageCost: 900,
    latitude: 28.215,
    longitude: 83.995,
  },
  {
    _id: "loc-4",
    name: "Peace Pagoda",
    category: "temple viewpoint relaxation",
    description: "Peaceful hilltop viewpoint for couples and families",
    district: "Kaski",
    province: "Gandaki",
    averageCost: 1400,
    latitude: 28.2008,
    longitude: 83.944,
  },
];

const tests = [
  () => {
    assert.equal(getMinimumBudget({ destination: "Pokhara", durationDays: 3 }), 3000);
    assert.equal(getMinimumBudget({ destination: "Mustang", durationDays: 3 }), 15000);
    return "minimum budget rules";
  },
  () => {
    const alternatives = createItineraryAlternatives({
      locationCandidates: sampleLocations,
      destination: "Pokhara",
      budget: 18000,
      durationDays: 2,
      interests: ["food", "sunrise", "culture"],
      startDate: "2026-05-10",
      pace: "balanced",
      tripStyle: "culture",
      companionType: "solo",
    });

    assert.equal(alternatives.length, 3);
    assert.deepEqual(alternatives.map((item) => item.key), ["recommended", "saver", "explorer"]);
    assert.equal(alternatives.filter((item) => item.isRecommended).length, 1);
    assert.equal(alternatives.find((item) => item.key === "saver").summary.pace, "Relaxed");
    assert.equal(alternatives.find((item) => item.key === "explorer").summary.pace, "Fast");
    assert.ok(alternatives.every((item) => item.days.length === 2 && item.totalEstimatedCost > 0));
    return "three itinerary alternatives";
  },
  () => {
    const post = new Post({
      userId: new mongoose.Types.ObjectId(),
      content: "Testing a moderation-ready post",
    });
    const review = new Review({
      userId: new mongoose.Types.ObjectId(),
      destination: "Pokhara",
      rating: 5,
      reviewText: "Great place for a weekend trip.",
    });

    assert.equal(post.status, "pending");
    assert.equal(review.status, "pending");
    return "moderation defaults";
  },
  () => {
    assert.equal(isSingleSessionBookingType("activity"), true);
    assert.equal(isSingleSessionBookingType("hotel"), false);
    assert.equal(
      calculateNights(new Date("2026-05-10"), new Date("2026-05-13")),
      3
    );

    const pricing = buildPriceBreakdown({ unitPrice: 2000, nights: 2 });
    assert.deepEqual(pricing, {
      unitPrice: 2000,
      nights: 2,
      subtotal: 4000,
      serviceFee: 320,
      tax: 520,
      total: 4840,
    });
    return "booking pricing helpers";
  },
];

let passed = 0;

for (const run of tests) {
  const label = run();
  passed += 1;
  console.log(`PASS ${label}`);
}

console.log(`\n${passed}/${tests.length} tests passed`);
