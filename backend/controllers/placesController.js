const Location = require("../models/Location");

const EARTH_RADIUS_KM = 6371;
const TYPE_KEYWORDS = {
  tourist_attraction: [
    "tourist",
    "attraction",
    "landmark",
    "sightseeing",
    "heritage",
    "religious",
    "site",
    "temple",
    "stupa",
    "monastery",
    "museum",
    "lake",
    "cave",
    "waterfall",
    "view",
    "viewpoint",
    "hill",
    "pagoda",
    "adventure",
    "park",
  ],
  lodging: [
    "hotel",
    "hotels",
    "stay",
    "stays",
    "lodging",
    "resort",
    "guest house",
    "guesthouse",
    "homestay",
    "hostel",
    "inn",
    "villa",
    "accommodation",
    "lodge",
    "mountain lodge",
  ],
  restaurant: [
    "restaurant",
    "restaurants",
    "food",
    "dining",
    "eatery",
    "bbq",
    "kitchen",
    "thakali",
    "khaja",
    "bhojanalaya",
    "food court",
    "rooftop restaurant",
  ],
  cafe: [
    "cafe",
    "cafes",
    "coffee",
    "coffee shop",
    "bakery",
    "tea",
    "tea house",
    "espresso",
    "bistro",
  ],
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

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

const fetchGooglePlacesByText = async ({ apiKey, lat, lng, radius, query, maxResultCount }) => {
  const endpoint = "https://places.googleapis.com/v1/places:searchText";
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.googleMapsUri,places.types",
    },
    body: JSON.stringify({
      textQuery: query,
      maxResultCount,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return (data.places || []).map((place) => mapGooglePlace(place, lat, lng));
};

const getLocalNearbyFromLocations = async ({ lat, lng, query, type, limit = 20, radiusKm }) => {
  const tokens = `${query || ""}`
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !["in", "near", "around", "the"].includes(token));

  const typeKeywords = TYPE_KEYWORDS[type] || [type];
  const allLocations = await Location.find().lean();

  const filtered = allLocations
    .filter((location) => {
      const text = [location.name, location.description, location.category, location.district, location.province]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const distanceKm =
        typeof lat === "number" && typeof lng === "number"
          ? haversineDistanceKm(lat, lng, location.latitude, location.longitude)
          : null;
      const withinRadius = distanceKm === null || !Number.isFinite(radiusKm) ? true : distanceKm <= radiusKm;
      const matchesType = typeKeywords.length ? typeKeywords.some((token) => text.includes(token)) : true;

      return withinRadius && matchesType;
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

const mergePlaces = ({ localPlaces = [], remotePlaces = [], limit = 20 }) => {
  const seen = new Set();
  const merged = [];

  [...localPlaces, ...remotePlaces].forEach((place) => {
    const key = normalizeText(place.placeId || `${place.name}-${place.location?.lat}-${place.location?.lng}`);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(place);
  });

  return merged
    .sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    .slice(0, limit);
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

    const radiusKm = radius / 1000;
    const localPlaces = await getLocalNearbyFromLocations({
      lat,
      lng,
      query,
      type,
      limit: maxResultCount,
      radiusKm,
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return res.json({ source: "local_fallback", places: localPlaces });
    }

    if (query) {
      const textPlaces = await fetchGooglePlacesByText({ apiKey, lat, lng, radius, query, maxResultCount });
      if (textPlaces?.length) {
        return res.json({
          source: localPlaces.length ? "local_and_google_places_text" : "google_places_text",
          places: mergePlaces({ localPlaces, remotePlaces: textPlaces, limit: maxResultCount }),
        });
      }
    }

    const endpoint = "https://places.googleapis.com/v1/places:searchNearby";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.photos,places.googleMapsUri,places.types",
      },
      body: JSON.stringify({
        includedTypes: [type],
        maxResultCount,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      }),
    });

    if (!response.ok) {
      return res.json({ source: "local_fallback", places: localPlaces });
    }

    const data = await response.json();
    const places = (data.places || []).map((place) => mapGooglePlace(place, lat, lng));
    res.json({
      source: localPlaces.length ? "local_and_google_places" : "google_places",
      places: mergePlaces({ localPlaces, remotePlaces: places, limit: maxResultCount }),
    });
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
