require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Location = require("../models/Location");
const Listing = require("../models/Listing");
const TripPackage = require("../models/TripPackage");
const User = require("../models/User");
const { locationSeeds, listingSeeds, nearbyRecommendations } = require("../seeds/lumbiniSeedData");
const { tripPackageSeeds } = require("../seeds/lumbiniTripPackageSeeds");

async function pickCreator() {
  const adminUser = await User.findOne({ role: "admin" }).select("_id name email");
  if (adminUser) return adminUser;
  return User.findOne({}).select("_id name email");
}

async function upsertLocations() {
  const hubSeed = locationSeeds.find((item) => item.key === "lumbini");
  const childSeeds = locationSeeds.filter((item) => item.key !== "lumbini");

  if (!hubSeed) {
    throw new Error("Lumbini hub seed is missing.");
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

  const lumbiniHub = await Location.findOneAndUpdate(
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

  const locationMap = new Map([[hubSeed.key, lumbiniHub]]);

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
          parentLocationId: lumbiniHub._id,
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

function buildTripPackagePayload(seed, listingMap) {
  const resolveListing = (title) => listingMap.get(title) || null;
  const resolveId = (title) => resolveListing(title)?._id;

  return {
    title: seed.title,
    slug: seed.slug,
    shortDescription: seed.shortDescription,
    description: seed.description,
    location: seed.location,
    region: seed.region,
    pickupCity: seed.pickupCity,
    dropoffCity: seed.dropoffCity,
    startDate: new Date(seed.startDate),
    endDate: new Date(seed.endDate),
    basePrice: seed.basePrice,
    discountPrice: seed.discountPrice,
    rating: seed.rating || 0,
    currency: seed.currency || "NPR",
    capacity: seed.capacity,
    minGuests: seed.minGuests,
    maxGuests: seed.maxGuests,
    coverImage: seed.coverImage || "",
    galleryImages: Array.isArray(seed.galleryImages) ? seed.galleryImages : [],
    videoUrl: seed.videoUrl || "",
    included: Array.isArray(seed.included) ? seed.included : [],
    excluded: Array.isArray(seed.excluded) ? seed.excluded : [],
    highlights: Array.isArray(seed.highlights) ? seed.highlights : [],
    bestSeason: seed.bestSeason || "",
    difficulty: seed.difficulty || "",
    tripType: seed.tripType || "",
    cancellationPolicy: seed.cancellationPolicy || "",
    paymentPolicy: seed.paymentPolicy || "",
    faqs: Array.isArray(seed.faqs) ? seed.faqs : [],
    itineraryDays: Array.isArray(seed.itineraryDays)
      ? seed.itineraryDays.map((day, index) => ({
          dayNumber: Number(day.dayNumber || index + 1),
          title: day.title || "",
          summary: day.summary || "",
          hotelName: day.hotelTitle || "",
          hotelListingId: resolveId(day.hotelTitle),
          meals: Array.isArray(day.meals) ? day.meals : [],
          transport: day.transport || "",
          altitude: day.altitude || "",
          notes: day.notes || "",
          image: day.image || "",
          activities: Array.isArray(day.activities)
            ? day.activities
                .map((activity) => ({
                  listingId: resolveId(activity.listingTitle),
                  title: activity.listingTitle || activity.title || "",
                  notes: activity.notes || "",
                }))
                .filter((activity) => activity.listingId || activity.title)
            : [],
        }))
      : [],
    addOnListings: Array.isArray(seed.addOnTitles)
      ? seed.addOnTitles.map((title) => resolveId(title)).filter(Boolean)
      : [],
    isFeatured: Boolean(seed.isFeatured),
    isActive: seed.isActive !== false,
  };
}

async function upsertTripPackages() {
  const listings = await Listing.find({ isActive: true }).select("_id title type");
  const listingMap = new Map(listings.map((listing) => [listing.title, listing]));

  let createdCount = 0;
  let updatedCount = 0;

  for (const seed of tripPackageSeeds) {
    const payload = buildTripPackagePayload(seed, listingMap);
    const existing = await TripPackage.findOne({ slug: seed.slug }).select("_id");

    if (existing) {
      await TripPackage.findByIdAndUpdate(existing._id, { $set: payload });
      updatedCount += 1;
    } else {
      await TripPackage.create(payload);
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
  const tripPackageResult = await upsertTripPackages();
  const lumbini = locationMap.get("lumbini");
  const childCount = Array.from(locationMap.keys()).filter((key) => key !== "lumbini").length;

  console.log("Lumbini seed import completed.");
  console.log(`Creator account: ${creator.email}`);
  console.log(`Destination hub: ${lumbini.name}`);
  console.log(`Child places linked under Lumbini: ${childCount}`);
  console.log(`Listings created: ${listingResult.createdCount}`);
  console.log(`Listings updated: ${listingResult.updatedCount}`);
  console.log(`Trip packages created: ${tripPackageResult.createdCount}`);
  console.log(`Trip packages updated: ${tripPackageResult.updatedCount}`);
  console.log(`Nearby recommendations bundled in seed file: ${nearbyRecommendations.length}`);
}

run()
  .catch((error) => {
    console.error("Lumbini seed import failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
