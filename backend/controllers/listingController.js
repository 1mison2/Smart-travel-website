const mongoose = require("mongoose");
const Listing = require("../models/Listing");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const buildImageUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/${filename}`;
const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseJsonIfNeeded = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return value;
  }
};

const dedupePreserveOrder = (items) => {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const value = String(item || "").trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
};

const normalizeStringArray = (input) => {
  const parsed = parseJsonIfNeeded(input);
  if (Array.isArray(parsed)) {
    return dedupePreserveOrder(parsed);
  }
  if (typeof parsed === "string") {
    return dedupePreserveOrder(
      parsed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    );
  }
  return [];
};

const normalizeReviews = (input) => {
  const parsed = parseJsonIfNeeded(input);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item) => ({
      author: String(item?.author || "").trim(),
      rating: Number(item?.rating || 0),
      comment: String(item?.comment || "").trim(),
      date: item?.date ? new Date(item.date) : new Date(),
    }))
    .filter((item) => item.author && item.comment && item.rating >= 1 && item.rating <= 5);
};

exports.createListing = async (req, res) => {
  try {
    const payload = req.body || {};
    payload.location = parseJsonIfNeeded(payload.location) || payload.location;
    const lat =
      payload.location?.lat === undefined || payload.location?.lat === null || payload.location?.lat === ""
        ? undefined
        : Number(payload.location?.lat);
    const lng =
      payload.location?.lng === undefined || payload.location?.lng === null || payload.location?.lng === ""
        ? undefined
        : Number(payload.location?.lng);

    const uploadedPhotos = Array.isArray(req.files)
      ? req.files.map((file) => buildImageUrl(req, file.filename))
      : [];
    const manualPhotos = normalizeStringArray(payload.photos);
    const mergedPhotos = dedupePreserveOrder([...manualPhotos, ...uploadedPhotos]);

    const listing = await Listing.create({
      type: payload.type,
      title: payload.title,
      description: payload.description || "",
      location: {
        name: payload.location?.name,
        address: payload.location?.address || "",
        district: payload.location?.district || "",
        province: payload.location?.province || "",
        lat,
        lng,
      },
      pricePerUnit: Number(payload.pricePerUnit),
      capacity: Number(payload.capacity || 1),
      amenities: normalizeStringArray(payload.amenities),
      photos: mergedPhotos,
      rating: Number(payload.rating || 0),
      reviews: normalizeReviews(payload.reviews),
      isActive: payload.isActive !== false,
      createdBy: req.user._id,
    });
    res.status(201).json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create listing" });
  }
};

exports.getListings = async (req, res) => {
  try {
    const query = {};
    if (req.query.type) query.type = String(req.query.type);
    if (req.query.locationNames) {
      const names = String(req.query.locationNames)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (names.length) {
        query["location.name"] = {
          $in: names.map((name) => new RegExp(`^${escapeRegex(name)}$`, "i")),
        };
      }
    }
    if (req.query.city) {
      const city = String(req.query.city);
      query.$or = [
        { "location.name": { $regex: city, $options: "i" } },
        { "location.district": { $regex: city, $options: "i" } },
        { "location.province": { $regex: city, $options: "i" } },
      ];
    }
    if (req.query.district) query["location.district"] = { $regex: String(req.query.district), $options: "i" };
    if (req.query.active !== undefined) query.isActive = String(req.query.active) === "true";
    if (!req.query.includeInactive) query.isActive = true;

    const listings = await Listing.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ listings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch listings" });
  }
};

exports.getListingById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid listing id" });
    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch listing" });
  }
};

exports.updateListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid listing id" });

    const payload = { ...req.body };
    payload.location = parseJsonIfNeeded(payload.location) || payload.location;
    if (payload.pricePerUnit !== undefined) payload.pricePerUnit = Number(payload.pricePerUnit);
    if (payload.capacity !== undefined) payload.capacity = Number(payload.capacity);
    if (payload.rating !== undefined) payload.rating = Number(payload.rating);
    if (payload.reviews !== undefined) payload.reviews = normalizeReviews(payload.reviews);
    if (payload.amenities !== undefined) payload.amenities = normalizeStringArray(payload.amenities);
    if (payload.photos !== undefined) payload.photos = normalizeStringArray(payload.photos);
    if (Array.isArray(req.files) && req.files.length) {
      const uploadedPhotos = req.files.map((file) => buildImageUrl(req, file.filename));
      payload.photos = dedupePreserveOrder([...(payload.photos || []), ...uploadedPhotos]);
    }
    if (payload.location?.lat !== undefined) {
      payload.location.lat =
        payload.location.lat === null || payload.location.lat === "" ? undefined : Number(payload.location.lat);
    }
    if (payload.location?.lng !== undefined) {
      payload.location.lng =
        payload.location.lng === null || payload.location.lng === "" ? undefined : Number(payload.location.lng);
    }

    const listing = await Listing.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update listing" });
  }
};

exports.deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid listing id" });
    const deleted = await Listing.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Listing not found" });
    res.json({ message: "Listing deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete listing" });
  }
};
