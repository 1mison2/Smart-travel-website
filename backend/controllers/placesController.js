const Location = require("../models/Location");

const EARTH_RADIUS_KM = 6371;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const buildGooglePhotoUrl = (photoName) => {
  if (!photoName || !process.env.GOOGLE_MAPS_API_KEY) return "";
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${process.env.GOOGLE_MAPS_API_KEY}`;
};

const mapGooglePlace = (place, lat, lng) => {
  const placeLat = place?.location?.latitude;
  const placeLng = place?.location?.longitude;
  const distanceKm =
    typeof placeLat === "number" && typeof placeLng === "number"
      ? Number(haversineDistanceKm(lat, lng, placeLat, placeLng).toFixed(2))
      : null;

  return {
    placeId: place.id,
    name: place.displayName?.text || "Unknown",
    rating: place.rating || 0,
    address: place.formattedAddress || "",
    location: {
      lat: placeLat,
      lng: placeLng,
    },
    distanceKm,
    photo: buildGooglePhotoUrl(place.photos?.[0]?.name),
    mapUri: place.googleMapsUri || "",
    categories: place.types || [],
  };
};

const fallbackNearbyFromLocations = async ({ lat, lng, query, type, limit = 20 }) => {
  const keyword = `${query || type || ""}`.trim().toLowerCase();
  const allLocations = await Location.find().lean();

  const filtered = allLocations
    .filter((location) => {
      if (!keyword) return true;
      const text = [location.name, location.description, location.category, location.district, location.province]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(keyword);
    })
    .map((location) => ({
      placeId: String(location._id),
      name: location.name,
      rating: 4.2,
      address: [location.district, location.province].filter(Boolean).join(", "),
      location: { lat: location.latitude, lng: location.longitude },
      distanceKm:
        typeof lat === "number" && typeof lng === "number"
          ? Number(haversineDistanceKm(lat, lng, location.latitude, location.longitude).toFixed(2))
          : null,
      photo: location.image || "",
      mapUri: "",
      categories: [location.category || "tourist_attraction"],
    }))
    .sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);

  return filtered;
};

exports.searchPlaces = async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    if (!query) return res.status(400).json({ message: "query is required" });

    const locations = await Location.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { district: { $regex: query, $options: "i" } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({
      results: locations.map((location) => ({
        id: location._id,
        name: location.name,
        district: location.district,
        province: location.province,
        category: location.category,
        description: location.description,
        latitude: location.latitude,
        longitude: location.longitude,
        averageCost: location.averageCost,
        image: location.image || "",
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to search destinations" });
  }
};

exports.getNearbyPlaces = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radius = Number(req.query.radius || 3000);
    const type = String(req.query.type || "tourist_attraction");
    const query = String(req.query.query || "");
    const maxResultCount = Math.min(Number(req.query.limit || 20), 20);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "lat and lng are required numeric values" });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      const fallbackPlaces = await fallbackNearbyFromLocations({ lat, lng, query, type, limit: maxResultCount });
      return res.json({ source: "local_fallback", places: fallbackPlaces });
    }

    const endpoint = "https://places.googleapis.com/v1/places:searchNearby";
    const body = {
      includedTypes: [type],
      maxResultCount,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.googleMapsUri,places.types",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const fallbackPlaces = await fallbackNearbyFromLocations({ lat, lng, query, type, limit: maxResultCount });
      return res.json({ source: "local_fallback", places: fallbackPlaces });
    }

    const data = await response.json();
    const places = (data.places || []).map((place) => mapGooglePlace(place, lat, lng));
    res.json({ source: "google_places", places });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch nearby places" });
  }
};

exports.getPlaceDetails = async (req, res) => {
  try {
    const { placeId } = req.params;
    if (!placeId) return res.status(400).json({ message: "placeId is required" });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return res.status(400).json({ message: "Google Maps API key is not configured" });

    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,formattedAddress,location,rating,photos,googleMapsUri,types,currentOpeningHours,websiteUri,nationalPhoneNumber,priceLevel",
      },
    });

    if (!response.ok) {
      return res.status(502).json({ message: "Failed to fetch place details from Google Places" });
    }

    const place = await response.json();
    res.json({
      placeId: place.id,
      name: place.displayName?.text || "Unknown",
      rating: place.rating || 0,
      address: place.formattedAddress || "",
      website: place.websiteUri || "",
      phone: place.nationalPhoneNumber || "",
      mapUri: place.googleMapsUri || "",
      openingHours: place.currentOpeningHours || null,
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
      photos: (place.photos || []).slice(0, 5).map((photo) => buildGooglePhotoUrl(photo.name)).filter(Boolean),
      categories: place.types || [],
      priceLevel: place.priceLevel || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch place details" });
  }
};
