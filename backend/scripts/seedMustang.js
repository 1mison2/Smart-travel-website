require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Location = require("../models/Location");
const { locationSeeds } = require("../seeds/mustangSeedData");

async function upsertLocations() {
  const hubSeed = locationSeeds.find((item) => item.key === "mustang");
  const childSeeds = locationSeeds.filter((item) => item.key !== "mustang");

  if (!hubSeed) {
    throw new Error("Mustang hub seed is missing.");
  }

  const preserveMedia = (seed, existing) => ({
    image: seed.image || existing?.image || "",
    images:
      Array.isArray(seed.images) && seed.images.length
        ? seed.images
        : Array.isArray(existing?.images)
          ? existing.images
          : [],
  });

  const existingHub = await Location.findOne({
    name: hubSeed.name,
    district: hubSeed.district,
    province: hubSeed.province,
  }).select("image images");
  const hubMedia = preserveMedia(hubSeed, existingHub);

  const mustangHub = await Location.findOneAndUpdate(
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
        image: hubMedia.image,
        images: hubMedia.images,
        latitude: hubSeed.latitude,
        longitude: hubSeed.longitude,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const locationMap = new Map([[hubSeed.key, mustangHub]]);

  for (const seed of childSeeds) {
    const existingLocation = await Location.findOne({
      name: seed.name,
      district: seed.district,
      province: seed.province,
    }).select("image images");
    const media = preserveMedia(seed, existingLocation);

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
          parentLocationId: mustangHub._id,
          description: seed.description,
          category: seed.category,
          averageCost: seed.averageCost,
          image: media.image,
          images: media.images,
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

async function run() {
  await connectDB();
  const locationMap = await upsertLocations();
  const mustang = locationMap.get("mustang");
  const childCount = Array.from(locationMap.keys()).filter((key) => key !== "mustang").length;

  console.log("Mustang seed import completed.");
  console.log(`Destination hub: ${mustang.name}`);
  console.log(`Child places linked under Mustang: ${childCount}`);
}

run()
  .catch((error) => {
    console.error("Mustang seed import failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
