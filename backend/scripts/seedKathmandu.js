require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Location = require("../models/Location");
const Listing = require("../models/Listing");
const User = require("../models/User");
const { locationSeeds, listingSeeds, nearbyRecommendations } = require("../seeds/kathmanduSeedData");

async function pickCreator() {
  const adminUser = await User.findOne({ role: "admin" }).select("_id name email");
  if (adminUser) return adminUser;
  return User.findOne({}).select("_id name email");
}

async function upsertLocations() {
  const hubSeed = locationSeeds.find((item) => item.key === "kathmandu");
  const childSeeds = locationSeeds.filter((item) => item.key !== "kathmandu");

  const kathmanduHub = await Location.findOneAndUpdate(
    {
      name: hubSeed.name,
      district: hubSeed.district,
      province: hubSeed.province,
    },
    {
      $set: {
        name: hubSeed.name,
        province: hubSeed.province,
        district: hubSeed.district,
        parentLocationId: null,
        description: hubSeed.description,
        category: hubSeed.category,
        averageCost: hubSeed.averageCost,
        image: hubSeed.image || "",
        images: hubSeed.images || [],
        latitude: hubSeed.latitude,
        longitude: hubSeed.longitude,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const locationMap = new Map([[hubSeed.key, kathmanduHub]]);

  for (const seed of childSeeds) {
    const location = await Location.findOneAndUpdate(
      {
        name: seed.name,
        district: seed.district,
        province: seed.province,
      },
      {
        $set: {
          name: seed.name,
          province: seed.province,
          district: seed.district,
          parentLocationId: kathmanduHub._id,
          description: seed.description,
          category: seed.category,
          averageCost: seed.averageCost,
          image: seed.image || "",
          images: seed.images || [],
          latitude: seed.latitude,
          longitude: seed.longitude,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    locationMap.set(seed.key, location);
  }

  return locationMap;
}

async function upsertListings(createdBy) {
  let createdCount = 0;
  let updatedCount = 0;

  for (const seed of listingSeeds) {
    const existing = await Listing.findOne({
      type: seed.type,
      title: seed.title,
    }).select("_id createdBy");

    const payload = {
      type: seed.type,
      title: seed.title,
      description: seed.description,
      location: seed.location,
      pricePerUnit: seed.pricePerUnit,
      capacity: seed.capacity,
      amenities: seed.amenities,
      photos: seed.photos || [],
      rating: seed.rating,
      isActive: true,
      createdBy: existing?.createdBy || createdBy,
    };

    if (existing) {
      await Listing.findByIdAndUpdate(existing._id, { $set: payload });
      updatedCount += 1;
    } else {
      await Listing.create(payload);
      createdCount += 1;
    }
  }

  return { createdCount, updatedCount };
}

async function run() {
  await connectDB();

  const creator = await pickCreator();
  if (!creator) {
    throw new Error("No users found. Create at least one user or admin before seeding listings.");
  }

  const locationMap = await upsertLocations();
  const listingResult = await upsertListings(creator._id);

  const kathmandu = locationMap.get("kathmandu");
  const childCount = Array.from(locationMap.keys()).filter((key) => key !== "kathmandu").length;

  console.log("Kathmandu seed import completed.");
  console.log(`Creator account: ${creator.email}`);
  console.log(`Destination hub: ${kathmandu.name}`);
  console.log(`Child places linked under Kathmandu: ${childCount}`);
  console.log(`Listings created: ${listingResult.createdCount}`);
  console.log(`Listings updated: ${listingResult.updatedCount}`);
  console.log(`Nearby recommendations bundled in seed file: ${nearbyRecommendations.length}`);
}

run()
  .catch((error) => {
    console.error("Kathmandu seed import failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
