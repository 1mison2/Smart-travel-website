const test = require("node:test");
const assert = require("node:assert/strict");
const {
  getMinimumBudget,
  createItineraryAlternatives,
} = require("../utils/itineraryPlanner");

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

test("getMinimumBudget increases for remote destinations", () => {
  assert.equal(getMinimumBudget({ destination: "Pokhara", durationDays: 3 }), 3000);
  assert.equal(getMinimumBudget({ destination: "Mustang", durationDays: 3 }), 15000);
});

test("createItineraryAlternatives returns three distinct planner options", () => {
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
  assert.deepEqual(
    alternatives.map((item) => item.key),
    ["recommended", "saver", "explorer"]
  );
  assert.equal(alternatives.filter((item) => item.isRecommended).length, 1);

  for (const option of alternatives) {
    assert.equal(option.days.length, 2);
    assert.ok(option.totalEstimatedCost > 0);
    assert.equal(option.summary.destination, "Pokhara");
    assert.equal(option.summary.durationDays, 2);
  }

  const saver = alternatives.find((item) => item.key === "saver");
  const explorer = alternatives.find((item) => item.key === "explorer");
  assert.equal(saver.summary.pace, "Relaxed");
  assert.equal(explorer.summary.pace, "Fast");
});

test("createItineraryAlternatives keeps low-budget plans within budget", () => {
  const alternatives = createItineraryAlternatives({
    locationCandidates: [
      {
        _id: "expensive-stupa",
        name: "Ramagrama Stupa",
        category: "stupa heritage",
        description: "Major heritage stop",
        district: "Nawalparasi West",
        province: "Lumbini",
        averageCost: 3000,
      },
    ],
    destination: "Ramagrama",
    budget: 1000,
    durationDays: 1,
    interests: ["stupa", "nawalparasi west"],
    startDate: "2026-06-02",
    pace: "balanced",
    tripStyle: "adventure",
    companionType: "solo",
  });

  const recommended = alternatives.find((item) => item.key === "recommended");
  assert.ok(recommended.totalEstimatedCost <= 1000);
  assert.ok(recommended.summary.budgetGap >= 0);
  assert.ok(
    recommended.days.every((day) => day.places.every((place) => place.name !== "Ramagrama Stupa"))
  );
});
