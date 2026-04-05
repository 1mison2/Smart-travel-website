const mongoose = require("mongoose");
const TripPackage = require("../models/TripPackage");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeFaqs = (value) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim(),
    }))
    .filter((item) => item.question && item.answer);
};

const normalizeActivities = (value) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => ({
      listingId: isValidObjectId(item?.listingId) ? item.listingId : undefined,
      title: String(item?.title || "").trim(),
      notes: String(item?.notes || "").trim(),
    }))
    .filter((item) => item.listingId || item.title);
};

const normalizeItineraryDays = (value) => {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item, index) => ({
      dayNumber: Number(item?.dayNumber || index + 1),
      title: String(item?.title || "").trim(),
      summary: String(item?.summary || "").trim(),
      hotelName: String(item?.hotelName || "").trim(),
      hotelListingId: isValidObjectId(item?.hotelListingId) ? item.hotelListingId : undefined,
      meals: normalizeStringList(item?.meals),
      transport: String(item?.transport || "").trim(),
      altitude: String(item?.altitude || "").trim(),
      notes: String(item?.notes || "").trim(),
      image: String(item?.image || "").trim(),
      activities: normalizeActivities(item?.activities),
    }))
    .filter((item) => item.dayNumber > 0 && (item.title || item.summary || item.hotelName || item.activities.length > 0))
    .sort((a, b) => a.dayNumber - b.dayNumber);
};

const buildSlug = (title) =>
  String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizePayload = (body = {}) => {
  const title = String(body.title || "").trim();
  const capacity = Number(body.capacity || 1);
  const minGuests = Math.max(1, Number(body.minGuests || 1));
  const maxGuests = Math.max(minGuests, Number(body.maxGuests || capacity || 1));

  return {
    title,
    slug: String(body.slug || "").trim() || buildSlug(title),
    shortDescription: String(body.shortDescription || "").trim(),
    description: String(body.description || "").trim(),
    location: String(body.location || "").trim(),
    region: String(body.region || "").trim(),
    pickupCity: String(body.pickupCity || "").trim(),
    dropoffCity: String(body.dropoffCity || "").trim(),
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    basePrice: Number(body.basePrice || 0),
    discountPrice: Number(body.discountPrice || 0),
    currency: String(body.currency || "NPR").trim() || "NPR",
    capacity,
    minGuests,
    maxGuests,
    coverImage: String(body.coverImage || "").trim(),
    galleryImages: normalizeStringList(body.galleryImages),
    videoUrl: String(body.videoUrl || "").trim(),
    included: normalizeStringList(body.included),
    excluded: normalizeStringList(body.excluded),
    highlights: normalizeStringList(body.highlights),
    bestSeason: String(body.bestSeason || "").trim(),
    difficulty: String(body.difficulty || "").trim(),
    tripType: String(body.tripType || "").trim(),
    cancellationPolicy: String(body.cancellationPolicy || "").trim(),
    paymentPolicy: String(body.paymentPolicy || "").trim(),
    faqs: normalizeFaqs(body.faqs),
    itineraryDays: normalizeItineraryDays(body.itineraryDays),
    addOnListings: Array.isArray(body.addOnListings)
      ? body.addOnListings.filter((item) => isValidObjectId(item))
      : normalizeStringList(body.addOnListings).filter((item) => isValidObjectId(item)),
    isFeatured: typeof body.isFeatured === "boolean" ? body.isFeatured : body.isFeatured === "true",
    isActive: typeof body.isActive === "boolean" ? body.isActive : body.isActive !== "false",
  };
};

const validatePayload = (payload) => {
  if (!payload.title) return "Title is required";
  if (!payload.slug) return "Slug is required";
  if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) return "Valid start date is required";
  if (!payload.endDate || Number.isNaN(payload.endDate.getTime())) return "Valid end date is required";
  if (payload.endDate < payload.startDate) return "End date must be after start date";
  if (Number.isNaN(payload.basePrice) || payload.basePrice < 0) return "Base price must be a valid number";
  if (Number.isNaN(payload.discountPrice) || payload.discountPrice < 0) return "Discount price must be a valid number";
  if (payload.discountPrice > 0 && payload.discountPrice > payload.basePrice) return "Discount price cannot exceed base price";
  if (Number.isNaN(payload.capacity) || payload.capacity < 1) return "Capacity must be at least 1";
  if (Number.isNaN(payload.minGuests) || payload.minGuests < 1) return "Minimum guests must be at least 1";
  if (Number.isNaN(payload.maxGuests) || payload.maxGuests < payload.minGuests) return "Maximum guests must be at least minimum guests";
  if (payload.maxGuests > payload.capacity) return "Maximum guests cannot exceed capacity";
  return "";
};

const populatePackageQuery = (query) =>
  query
    .populate("addOnListings", "title type pricePerUnit pricing isActive location")
    .populate("itineraryDays.hotelListingId", "title type location pricePerUnit photos")
    .populate("itineraryDays.activities.listingId", "title type location pricePerUnit photos");

exports.getAllTripPackages = async (_req, res) => {
  try {
    const packages = await populatePackageQuery(TripPackage.find().sort({ createdAt: -1 }));
    res.json({ packages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trip packages" });
  }
};

exports.getTripPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const tripPackage = await populatePackageQuery(TripPackage.findById(id));
    if (!tripPackage) return res.status(404).json({ message: "Trip package not found" });
    res.json({ tripPackage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch trip package" });
  }
};

exports.createTripPackage = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ message: error });

    const tripPackage = await TripPackage.create(payload);
    const populated = await populatePackageQuery(TripPackage.findById(tripPackage._id));
    res.status(201).json({ tripPackage: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create trip package" });
  }
};

exports.updateTripPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const payload = normalizePayload(req.body);
    const error = validatePayload(payload);
    if (error) return res.status(400).json({ message: error });

    const tripPackage = await TripPackage.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!tripPackage) return res.status(404).json({ message: "Trip package not found" });
    const populated = await populatePackageQuery(TripPackage.findById(tripPackage._id));
    res.json({ tripPackage: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update trip package" });
  }
};

exports.deleteTripPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid trip package id" });
    const deleted = await TripPackage.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Trip package not found" });
    res.json({ message: "Trip package deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete trip package" });
  }
};
