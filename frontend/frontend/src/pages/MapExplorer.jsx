import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  ChevronDown,
  ChevronLeft,
  Coffee,
  Compass,
  ExternalLink,
  GripVertical,
  LocateFixed,
  MapPin,
  Route,
  Search,
  Sparkles,
  Timer,
  Trees,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import TravelMapCanvas from "../components/map/TravelMapCanvas";
import api, { resolveImageUrl } from "../utils/api";
import {
  fetchOpenRouteServiceRoute,
  formatDistance,
  formatDuration,
} from "../utils/openRouteService";
import "./MapExplorer.css";

const DEFAULT_CENTER = [27.7172, 85.324];
const DEFAULT_ZOOM = 7;
const DEFAULT_NEARBY_TYPE = "tourist_attraction";
const NEARBY_TYPES = [
  { value: "tourist_attraction", label: "Attractions", icon: Trees },
  { value: "lodging", label: "Hotels", icon: BedDouble },
  { value: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
  { value: "cafe", label: "Cafes", icon: Coffee },
];
const CITY_AREA_PRESETS = {
  kathmandu: {
    id: "city-area-kathmandu",
    name: "Kathmandu Valley",
    district: "Kathmandu",
    province: "Bagmati",
    category: "city_area",
    description: "Kathmandu, Lalitpur, and Bhaktapur valley area",
    latitude: 27.7172,
    longitude: 85.324,
  },
  pokhara: {
    id: "city-area-pokhara",
    name: "Pokhara",
    district: "Kaski",
    province: "Gandaki",
    category: "city_area",
    description: "Pokhara city area",
    latitude: 28.2096,
    longitude: 83.9856,
  },
};

function formatCategory(value) {
  return String(value || "destination")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatPriceLevel(value) {
  const levels = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };
  return levels[String(value || "").trim()] || "";
}

function buildMapLink({ name, lat, lng, mapUri }) {
  if (mapUri) return mapUri;
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(name))}`;
  }
  return "";
}

function reorderItems(items, fromIndex, toIndex) {
  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, moved);
  return nextItems;
}

function normalizeCategoryToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ");
}

function getCategoryTokensFromText(value) {
  const normalized = normalizeCategoryToken(value);
  if (!normalized) return [];
  return normalized
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getDestinationCategoryTokens(item) {
  return Array.from(
    new Set([
      ...getCategoryTokensFromText(item?.category),
      ...getCategoryTokensFromText(item?.categoryLabel),
    ])
  );
}

function getNearbyCategoryTokens(place) {
  return Array.from(
    new Set(
      [
        place?.name,
        ...(Array.isArray(place?.categories) ? place.categories : []),
      ]
        .flatMap((value) => getCategoryTokensFromText(value))
        .filter(Boolean)
    )
  );
}

function hashNumber(input) {
  return String(input || "smart-travel").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function buildRating(seed) {
  return ((44 + (hashNumber(seed) % 6)) / 10).toFixed(1);
}

function estimateVisitTime(category) {
  const value = String(category || "").toLowerCase();
  if (value.includes("temple")) return "1-2 hours";
  if (value.includes("lake")) return "2-3 hours";
  if (value.includes("adventure")) return "Half day";
  if (value.includes("view")) return "45-90 min";
  return "1-3 hours";
}

function normalizeDestination(item) {
  const categoryLabel = formatCategory(item.category || "destination");
  return {
    id: item.id,
    kind: "destination",
    name: item.name,
    district: item.district || "",
    province: item.province || "",
    category: item.category || "destination",
    categoryLabel,
    description: item.description || "",
    image: resolveImageUrl(item.image || item.images?.[0] || ""),
    averageCost: item.averageCost || 0,
    rating: buildRating(item.id || item.name),
    visitTime: estimateVisitTime(item.category),
    lat: Number(item.latitude),
    lng: Number(item.longitude),
  };
}

function getCityAreaPreset(query) {
  const key = String(query || "").trim().toLowerCase();
  const preset = CITY_AREA_PRESETS[key];
  return preset ? normalizeDestination(preset) : null;
}

function scoreSearchMatch(query, item) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return -1;

  const name = String(item?.name || "").trim().toLowerCase();
  const district = String(item?.district || "").trim().toLowerCase();
  const province = String(item?.province || "").trim().toLowerCase();
  const category = String(item?.category || "").trim().toLowerCase();

  let score = 0;

  if (name === q) score += 1000;
  else if (name.startsWith(q)) score += 700;
  else if (name.includes(q)) score += 450;

  if (district === q) score += 350;
  else if (district.includes(q)) score += 160;

  if (province === q) score += 120;
  else if (province.includes(q)) score += 60;

  if (["city", "municipality", "town", "destination"].some((token) => category.includes(token))) {
    score += 40;
  }

  if (q.split(/\s+/).every((word) => name.includes(word))) {
    score += 80;
  }

  return score;
}

function pickBestSearchResult(query, results) {
  if (!Array.isArray(results) || !results.length) return null;

  return [...results]
    .map((item, index) => ({
      item,
      index,
      score: scoreSearchMatch(query, item),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })[0]?.item || null;
}

function isKathmanduValleyPlace(destination) {
  const text = [
    destination?.name,
    destination?.district,
    destination?.province,
    destination?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("kathmandu") ||
    text.includes("lalitpur") ||
    text.includes("patan") ||
    text.includes("bhaktapur")
  );
}

function isPokharaAreaPlace(destination) {
  const text = [
    destination?.name,
    destination?.district,
    destination?.province,
    destination?.description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("pokhara") || text.includes("kaski");
}

function getHighlightRadiusMeters(destination) {
  if (!destination) return 0;
  if (isPokharaAreaPlace(destination)) return 15000;
  return isKathmanduValleyPlace(destination) ? 18000 : 5000;
}

function getNearbyRadiusMeters(destination) {
  if (!destination) return 7000;
  if (isPokharaAreaPlace(destination)) return 18000;
  return isKathmanduValleyPlace(destination) ? 22000 : 7000;
}

function buildNearbyQuery(destination, type) {
  const label = NEARBY_TYPES.find((item) => item.value === type)?.label || "Places";
  return `${label} near ${destination.name}`;
}

function normalizeNearbyToStop(place, type) {
  return {
    id: `nearby-${place.placeId}`,
    sourceId: place.placeId,
    kind: "nearby",
    type,
    name: place.name,
    district: place.address || "",
    province: "",
    category: type,
    categoryLabel: formatCategory(type),
    description: place.address || "",
    image: place.photo || "",
    averageCost: 0,
    rating: Number(place.rating || buildRating(place.placeId || place.name)).toFixed(1),
    visitTime: "30-90 min",
    lat: Number(place.location?.lat),
    lng: Number(place.location?.lng),
  };
}

function normalizeItineraryPlaceToStop(place, index, dayNumber) {
  return {
    id: `itinerary-day-${dayNumber}-stop-${place?.placeId || index + 1}`,
    sourceId: place?.placeId || "",
    kind: "itinerary",
    name: place?.name || `Stop ${index + 1}`,
    district: "",
    province: "",
    category: place?.category || "Itinerary stop",
    categoryLabel: formatCategory(place?.category || "Itinerary stop"),
    description: place?.notes || "",
    image: place?.image || "",
    averageCost: Number(place?.estimatedCost || 0),
    rating: "",
    visitTime: "Planned stop",
    lat: Number(place?.latitude),
    lng: Number(place?.longitude),
  };
}

function calculateDistanceKm(from, to) {
  const lat1 = Number(from?.lat);
  const lng1 = Number(from?.lng);
  const lat2 = Number(to?.lat);
  const lng2 = Number(to?.lng);
  if ([lat1, lng1, lat2, lng2].some((value) => !Number.isFinite(value))) return null;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return Number((earthKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1));
}

function buildFallbackRoute(stops) {
  const safeStops = (Array.isArray(stops) ? stops : []).filter((stop) => Number.isFinite(Number(stop?.lat)) && Number.isFinite(Number(stop?.lng)));
  const distanceKm = safeStops.reduce((sum, stop, index) => {
    if (index === 0) return sum;
    return sum + (calculateDistanceKm(safeStops[index - 1], stop) || 0);
  }, 0);

  return {
    distance: Math.round(distanceKm * 1000),
    duration: Math.round((distanceKm / 25) * 3600),
    coordinates: safeStops.map((stop) => [Number(stop.lat), Number(stop.lng)]),
    isFallback: true,
  };
}

function isRoutablePointError(error) {
  return /routable point|specified coordinate|route request failed/i.test(String(error?.message || ""));
}

function FloatingChip({ active = false, children, ...props }) {
  return (
    <button
      {...props}
      className={`explorer-chip ${active ? "explorer-chip--active" : ""}`}
    >
      {children}
    </button>
  );
}

function GlassButton({ className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={`explorer-glass-button${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}

function FilterMenu({ label, valueLabel, isOpen, onToggle, options, onSelect }) {
  return (
    <div className={`explorer-filter-menu ${isOpen ? "is-open" : ""}`}>
      <button type="button" className="explorer-filter-menu__trigger" onClick={onToggle}>
        <span>{valueLabel || label}</span>
        <ChevronDown className={`h-4 w-4 explorer-filter-menu__chevron ${isOpen ? "is-open" : ""}`} />
      </button>
      {isOpen ? (
        <div className="explorer-filter-menu__panel">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`explorer-filter-menu__option ${option.active ? "is-active" : ""}`}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DestinationCard({ item, isActive, onSelect, onAdd }) {
  return (
    <article className={`explorer-card ${isActive ? "explorer-card--active" : ""}`}>
      <button type="button" onClick={() => onSelect(item)} className="explorer-card__button">
        <img
          src={item.image || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}
          alt={item.name}
          className="explorer-card__image"
        />
        <div className="explorer-card__body">
          <div className="explorer-card__top">
            <div>
              <h3>{item.name}</h3>
              <p>{item.locationLabel}</p>
            </div>
            <span>{item.rating}</span>
          </div>
          <div className="explorer-card__tags">
            <span>{item.categoryLabel}</span>
            <span>{item.visitTime}</span>
          </div>
        </div>
      </button>
      <div className="explorer-card__footer">
        <p>{item.distanceFromCurrent !== null ? `${item.distanceFromCurrent} km away` : "Map ready"}</p>
        <div className="explorer-card__footer-actions">
          {item.mapUri ? (
            <a href={item.mapUri} target="_blank" rel="noreferrer" className="explorer-card__link">
              Open
            </a>
          ) : null}
          <button type="button" onClick={() => onAdd(item)}>Add to route</button>
        </div>
      </div>
    </article>
  );
}

function NearbyCard({ place, onSelect, onAdd }) {
  return (
    <article className="explorer-card explorer-card--nearby">
      <img
        src={place.photo || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop"}
        alt={place.name}
        className="explorer-card__image explorer-card__image--small"
      />
      <div className="explorer-card__body">
        <h3>{place.name}</h3>
        <p>{place.address || "Nearby place"}</p>
      </div>
      <div className="explorer-card__footer">
        <button type="button" onClick={() => onSelect(place)} className="explorer-card__ghost">View</button>
        <div className="explorer-card__footer-actions">
          {buildMapLink({ name: place.name, lat: place.location?.lat, lng: place.location?.lng, mapUri: place.mapUri }) ? (
            <a
              href={buildMapLink({ name: place.name, lat: place.location?.lat, lng: place.location?.lng, mapUri: place.mapUri })}
              target="_blank"
              rel="noreferrer"
              className="explorer-card__link"
            >
              Open
            </a>
          ) : null}
          <button type="button" onClick={() => onAdd(place)}>Add</button>
        </div>
      </div>
    </article>
  );
}

export default function MapExplorer() {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initialQuery = useMemo(() => String(searchParams.get("query") || searchParams.get("q") || "").trim(), [searchParams]);
  const initialType = useMemo(() => String(searchParams.get("type") || DEFAULT_NEARBY_TYPE).trim(), [searchParams]);
  const initialItineraryId = useMemo(() => String(searchParams.get("itineraryId") || "").trim(), [searchParams]);
  const initialItineraryDay = useMemo(() => Number(searchParams.get("day") || 0), [searchParams]);

  const fallbackCenter = useMemo(() => {
    const lat = Number.parseFloat(searchParams.get("lat"));
    const lng = Number.parseFloat(searchParams.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng];
    return DEFAULT_CENTER;
  }, [searchParams]);

  const apiKey = import.meta.env.VITE_OPENROUTESERVICE_API_KEY;
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [destinationResults, setDestinationResults] = useState([]);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [nearbyType, setNearbyType] = useState(NEARBY_TYPES.some((item) => item.value === initialType) ? initialType : DEFAULT_NEARBY_TYPE);
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [nearbySource, setNearbySource] = useState("");
  const [route, setRoute] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [routeError, setRouteError] = useState("");
  const [nearbyError, setNearbyError] = useState("");
  const [loadingCurrentLocation, setLoadingCurrentLocation] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingItineraryRoute, setLoadingItineraryRoute] = useState(false);
  const [travelMode, setTravelMode] = useState("driving-car");
  const [itineraryStops, setItineraryStops] = useState([]);
  const [selectedNearbyPlaceId, setSelectedNearbyPlaceId] = useState("");
  const [mapFocusTarget, setMapFocusTarget] = useState(null);
  const [hasRequestedRoute, setHasRequestedRoute] = useState(false);
  const [categoryFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [distanceFilter, setDistanceFilter] = useState("all");
  const [openFilterMenu, setOpenFilterMenu] = useState("");
  const [routeOpen, setRouteOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [trayOpen, setTrayOpen] = useState(true);
  const [draggedStopId, setDraggedStopId] = useState("");

  const activeTripStops = useMemo(() => {
    if (itineraryStops.length) return itineraryStops;
    if (selectedDestination && selectedDestination.category !== "city_area") return [selectedDestination];
    return [];
  }, [itineraryStops, selectedDestination]);

  const mapStops = useMemo(() => {
    const points = [];
    if (currentLocation) {
      points.push({
        id: "current-location",
        kind: "origin",
        name: currentLocation.name,
        category: "current location",
        categoryLabel: "Current Location",
        rating: "5.0",
        visitTime: "Live position",
        lat: currentLocation.lat,
        lng: currentLocation.lng,
      });
    }
    activeTripStops.forEach((stop, index) => {
      points.push({ ...stop, id: stop.id || `stop-${index + 1}`, kind: stop.kind || (index === activeTripStops.length - 1 ? "destination" : "waypoint") });
    });
    return points;
  }, [activeTripStops, currentLocation]);

  const visibleNearbyPlaces = useMemo(() => {
    if (!selectedDestination) return nearbyPlaces;
    const selectedName = String(selectedDestination.name || "").trim().toLowerCase();
    const selectedLat = Number(selectedDestination.lat);
    const selectedLng = Number(selectedDestination.lng);
    return nearbyPlaces.filter((place) => {
      const placeName = String(place?.name || "").trim().toLowerCase();
      const placeLat = Number(place?.location?.lat);
      const placeLng = Number(place?.location?.lng);
      const sameCoordinates = Number.isFinite(selectedLat) && Number.isFinite(selectedLng) && Number.isFinite(placeLat) && Number.isFinite(placeLng) && Math.abs(selectedLat - placeLat) < 0.0005 && Math.abs(selectedLng - placeLng) < 0.0005;
      const sameNameAndDistance = selectedName && placeName === selectedName && Number(place?.distanceKm) === 0;
      return !(sameCoordinates || sameNameAndDistance);
    });
  }, [nearbyPlaces, selectedDestination]);

  const filteredNearbyPlaces = useMemo(
    () =>
      visibleNearbyPlaces.filter((place) => {
        const categoryTokens = getNearbyCategoryTokens(place);

        const matchesCategory =
          categoryFilter === "all" || categoryTokens.includes(normalizeCategoryToken(categoryFilter));
        const matchesRating =
          ratingFilter === "all" || Number(place?.rating || 0) >= Number(ratingFilter);
        const matchesDistance =
          distanceFilter === "all" ||
          !Number.isFinite(Number(place?.distanceKm)) ||
          Number(place.distanceKm) <= Number(distanceFilter);

        return matchesCategory && matchesRating && matchesDistance;
      }),
    [categoryFilter, distanceFilter, ratingFilter, visibleNearbyPlaces]
  );

  const destinationCards = useMemo(() => destinationResults.map((item) => ({ ...item, locationLabel: [item.district, item.province].filter(Boolean).join(", ") || "Nepal", distanceFromCurrent: calculateDistanceKm(currentLocation, item), mapUri: buildMapLink(item) })), [currentLocation, destinationResults]);
  const filteredDestinations = useMemo(() => destinationCards.filter((item) => {
    const categoryTokens = getDestinationCategoryTokens(item);
    const matchesCategory = categoryFilter === "all" || categoryTokens.includes(normalizeCategoryToken(categoryFilter));
    const matchesRating = ratingFilter === "all" || Number(item.rating) >= Number(ratingFilter);
    const matchesDistance = distanceFilter === "all" || item.distanceFromCurrent === null || item.distanceFromCurrent <= Number(distanceFilter);
    return matchesCategory && matchesRating && matchesDistance;
  }), [categoryFilter, destinationCards, distanceFilter, ratingFilter]);

  const mapCenter = selectedDestination ? [selectedDestination.lat, selectedDestination.lng] : currentLocation ? [currentLocation.lat, currentLocation.lng] : fallbackCenter;
  const selectedLocationId =
    selectedDestination?.category !== "city_area"
      ? selectedDestination?.id || (activeTripStops.length ? activeTripStops[activeTripStops.length - 1]?.id : "current-location")
      : activeTripStops.length
        ? activeTripStops[activeTripStops.length - 1]?.id
        : "current-location";
  const estimatedCost = route ? `NPR ${Math.max(450, Math.round((route.distance / 1000) * 18))}` : "--";
  const highlightRadiusMeters = getHighlightRadiusMeters(selectedDestination);
  const nearbyTypeLabel = NEARBY_TYPES.find((item) => item.value === nearbyType)?.label || "places";
  const activeFilterCount = [ratingFilter, distanceFilter].filter((value) => value !== "all").length;
  const currentSelectionMapUri = buildMapLink(selectedDestination || currentLocation || {});
  const nearbyStatus = useMemo(() => {
    if (!selectedDestination) {
      return {
        tone: "neutral",
        message: "Search and select a place to reveal nearby attractions, hotels, cafes, and restaurants.",
      };
    }

    if (loadingNearby) {
      return {
        tone: "neutral",
        message: `Loading ${nearbyTypeLabel.toLowerCase()} around ${selectedDestination.name}...`,
      };
    }

    if (nearbyError) {
      return {
        tone: "error",
        message: nearbyError,
      };
    }

    if (!filteredNearbyPlaces.length) {
      if (nearbySource === "local_fallback") {
        return {
          tone: "warning",
          message:
            activeFilterCount > 0
              ? `No ${nearbyTypeLabel.toLowerCase()} match your current filters around ${selectedDestination.name}.`
              : `No posted ${nearbyTypeLabel.toLowerCase()} found around ${selectedDestination.name}. Add local posts or configure Google Maps API for live results.`,
        };
      }

      return {
        tone: "warning",
        message:
          activeFilterCount > 0
            ? `No ${nearbyTypeLabel.toLowerCase()} match your current filters around ${selectedDestination.name}.`
            : `No ${nearbyTypeLabel.toLowerCase()} found around ${selectedDestination.name}.`,
      };
    }

    if (nearbySource === "local_fallback") {
      return {
        tone: "info",
        message: `Showing ${filteredNearbyPlaces.length} posted ${nearbyTypeLabel.toLowerCase()} from Smart Travel around ${selectedDestination.name}.`,
      };
    }

    if (String(nearbySource || "").includes("local_and_google")) {
      return {
        tone: "info",
        message: `Showing ${filteredNearbyPlaces.length} ${nearbyTypeLabel.toLowerCase()} from local posts and live map data around ${selectedDestination.name}.`,
      };
    }

    return {
      tone: "info",
      message: `Showing ${filteredNearbyPlaces.length} ${nearbyTypeLabel.toLowerCase()} around ${selectedDestination.name}.`,
    };
  }, [activeFilterCount, filteredNearbyPlaces.length, loadingNearby, nearbyError, nearbySource, nearbyTypeLabel, selectedDestination]);
  const ratingLabel =
    {
      all: "Rating",
      "4.8": "4.8+",
      "4.6": "4.6+",
      "4.4": "4.4+",
    }[ratingFilter] || "Rating";
  const distanceLabel =
    {
      all: "Distance",
      "25": "25 km",
      "50": "50 km",
      "100": "100 km",
    }[distanceFilter] || "Distance";

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const runDestinationSearch = async (term) => {
    const safeTerm = String(term || "").trim();
    if (!safeTerm) {
      setDestinationResults([]);
      setSelectedDestination(null);
      return;
    }
    try {
      setSearchError("");
      const { data } = await api.get(`/api/places/search?query=${encodeURIComponent(safeTerm)}`);
      const results = Array.isArray(data?.results) ? data.results.map(normalizeDestination) : [];
      setDestinationResults(results);
      if (results.length) {
        const areaPreset = getCityAreaPreset(safeTerm);
        const bestMatch = areaPreset || pickBestSearchResult(safeTerm, results) || results[0];
        setSelectedDestination(bestMatch);
        setSelectedNearbyPlaceId("");
        setMapFocusTarget({
          id: bestMatch.id,
          type: "location",
          lat: bestMatch.lat,
          lng: bestMatch.lng,
          zoom: 12,
        });
        setToast(`${bestMatch.name} selected`);
      } else {
        setSelectedDestination(null);
        setNearbyPlaces([]);
        setNearbySource("");
      }
    } catch (err) {
      setDestinationResults([]);
      setSearchError(err?.response?.data?.message || "Failed to search destinations.");
    } finally {
      // no-op
    }
  };

  const fetchNearbyPlaces = async (destination, type) => {
    if (!destination || !Number.isFinite(destination.lat) || !Number.isFinite(destination.lng)) {
      setNearbyPlaces([]);
      setNearbySource("");
      return;
    }
    try {
      setLoadingNearby(true);
      setNearbyError("");
      const params = new URLSearchParams({
        lat: String(destination.lat),
        lng: String(destination.lng),
        type,
        query: buildNearbyQuery(destination, type),
        radius: String(getNearbyRadiusMeters(destination)),
        limit: "12",
      });
      const { data } = await api.get(`/api/places/nearby?${params.toString()}`);
      setNearbyPlaces(Array.isArray(data?.places) ? data.places : []);
      setNearbySource(data?.source || "");
    } catch (err) {
      setNearbyPlaces([]);
      setNearbySource("");
      setNearbyError(err?.response?.data?.message || "Failed to load nearby places.");
    } finally {
      setLoadingNearby(false);
    }
  };

  const fetchRoute = async () => {
    const routeStops = currentLocation ? [currentLocation, ...activeTripStops] : activeTripStops;
    if (routeStops.length < 2) {
      setRoute(null);
      setRouteError("Pick at least two points, or use your location plus one destination.");
      return;
    }
    if (!apiKey) {
      setRoute(null);
      setRouteError("OpenRouteService key missing in frontend .env.");
      return;
    }
    try {
      setLoadingRoute(true);
      setRouteError("");
      const routeData = await fetchOpenRouteServiceRoute({ apiKey, profile: travelMode, locations: routeStops.map((stop) => ({ name: stop.name, lat: stop.lat, lng: stop.lng })) });
      setRoute(routeData);
      setHasRequestedRoute(true);
      setToast("Route generated");
    } catch (err) {
      if (isRoutablePointError(err)) {
        setRoute(buildFallbackRoute(routeStops));
        setHasRequestedRoute(true);
        setRouteError("Exact road routing is unavailable for one stop, so the map is showing an approximate day route.");
        setToast("Approximate route shown");
      } else {
        setRoute(null);
        setRouteError(err.message || "Failed to calculate route.");
      }
    } finally {
      setLoadingRoute(false);
    }
  };

  const addStopToItinerary = (stop) => {
    const normalizedStop = stop.kind === "nearby" || String(stop.id || "").startsWith("nearby-") ? stop : { ...stop, kind: stop.kind || "destination" };
    let didAdd = false;
    setItineraryStops((current) => {
      if (current.some((item) => item.id === normalizedStop.id)) return current;
      didAdd = true;
      return [...current, normalizedStop];
    });
    setToast(didAdd ? `${normalizedStop.name} added` : `${normalizedStop.name} is already in your route`);
  };

  const handleNearbyTypeChange = (nextType) => {
    setNearbyType(nextType);
    if (!selectedDestination) {
      const typeLabel = NEARBY_TYPES.find((item) => item.value === nextType)?.label || "places";
      setToast(`Select a destination first to explore nearby ${typeLabel.toLowerCase()}`);
      return;
    }
    const typeLabel = NEARBY_TYPES.find((item) => item.value === nextType)?.label || "places";
    setToast(`Showing nearby ${typeLabel.toLowerCase()} around ${selectedDestination.name}`);
  };

  const handleSelectNearbyPlace = (place) => {
    setSelectedNearbyPlaceId(place.placeId);
    setMapFocusTarget({ id: place.placeId, type: "nearby", lat: place.location?.lat, lng: place.location?.lng, zoom: 14 });
  };

  const handleSelectDestination = (item) => {
    setSelectedDestination(item);
    setSelectedNearbyPlaceId("");
    setMapFocusTarget({
      id: item.id,
      type: "location",
      lat: item.lat,
      lng: item.lng,
      zoom: 12,
    });
    setToast(`${item.name} focused`);
  };

  const handleRemoveStop = (stopId) => {
    setItineraryStops((current) => current.filter((item) => item.id !== stopId));
    setToast("Stop removed");
  };

  const handleReorderStop = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    setItineraryStops((current) => {
      const fromIndex = current.findIndex((item) => item.id === fromId);
      const toIndex = current.findIndex((item) => item.id === toId);
      if (fromIndex < 0 || toIndex < 0) return current;
      return reorderItems(current, fromIndex, toIndex);
    });
    setToast("Route order updated");
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setRouteError("Geolocation is not supported in this browser.");
      return;
    }
    setLoadingCurrentLocation(true);
    setRouteError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = { id: "current-location", name: "Your Location", lat: Number(position.coords.latitude.toFixed(5)), lng: Number(position.coords.longitude.toFixed(5)) };
        setCurrentLocation(nextLocation);
        setLoadingCurrentLocation(false);
        setMapFocusTarget({ id: nextLocation.id, type: "location", lat: nextLocation.lat, lng: nextLocation.lng, zoom: 12 });
        setToast("Live location found");
      },
      (geoError) => {
        setLoadingCurrentLocation(false);
        setRouteError(geoError.message || "Unable to access your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleResetMap = () => {
    setSelectedDestination(null);
    setSelectedNearbyPlaceId("");
    setNearbyPlaces([]);
    setNearbySource("");
    setRoute(null);
    setRouteError("");
    setNearbyError("");
    setHasRequestedRoute(false);
    setItineraryStops([]);
    setMapFocusTarget({ id: "reset", type: "reset", lat: fallbackCenter[0], lng: fallbackCenter[1], zoom: DEFAULT_ZOOM });
    setToast("Map reset");
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDestinationResults([]);
    setSelectedDestination(null);
    setSelectedNearbyPlaceId("");
    setNearbyPlaces([]);
    setNearbySource("");
    setSearchError("");
    setNearbyError("");
    setRoute(null);
    setRouteError("");
    setHasRequestedRoute(false);
    setItineraryStops([]);
    setMapFocusTarget({
      id: "clear-search",
      type: "reset",
      lat: fallbackCenter[0],
      lng: fallbackCenter[1],
      zoom: DEFAULT_ZOOM,
    });
    setToast("Search cleared");
  };

  useEffect(() => {
    if (initialItineraryId) return;
    if (initialQuery) runDestinationSearch(initialQuery);
  }, [initialItineraryId, initialQuery]);

  useEffect(() => {
    if (initialItineraryId) return undefined;
    const safeTerm = String(deferredSearchTerm || "").trim();
    if (safeTerm === initialQuery) return undefined;
    if (!safeTerm) {
      setDestinationResults([]);
      return undefined;
    }
    if (safeTerm.length < 2) return undefined;
    const timeoutId = window.setTimeout(() => runDestinationSearch(safeTerm), 320);
    return () => window.clearTimeout(timeoutId);
  }, [deferredSearchTerm, initialItineraryId, initialQuery]);

  useEffect(() => {
    if (selectedDestination) fetchNearbyPlaces(selectedDestination, nearbyType);
    else {
      setNearbyPlaces([]);
      setNearbySource("");
    }
  }, [nearbyType, selectedDestination]);

  useEffect(() => {
    if (hasRequestedRoute) fetchRoute();
  }, [activeTripStops, currentLocation, travelMode]);

  useEffect(() => {
    if (!selectedDestination && activeTripStops.length) {
      const lastStop = activeTripStops[activeTripStops.length - 1];
      if (lastStop?.kind !== "origin") {
        setSelectedDestination(lastStop);
      }
    }
  }, [activeTripStops, selectedDestination]);

  useEffect(() => {
    if (!initialItineraryId || !Number.isFinite(initialItineraryDay) || initialItineraryDay <= 0) return undefined;
    let active = true;

    const loadItineraryDayRoute = async () => {
      try {
        setLoadingItineraryRoute(true);
        setRouteError("");
        const { data } = await api.get(`/api/itineraries/${initialItineraryId}`);
        if (!active) return;

        const itinerary = data?.itinerary;
        const day = (Array.isArray(itinerary?.days) ? itinerary.days : []).find((item) => Number(item?.day) === initialItineraryDay);
        const stops = (Array.isArray(day?.places) ? day.places : [])
          .map((place, index) => normalizeItineraryPlaceToStop(place, index, initialItineraryDay))
          .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));

        if (!day || stops.length === 0) {
          setRouteError("This itinerary day does not have mapped places yet.");
          setItineraryStops([]);
          setSelectedDestination(null);
          setRoute(null);
          setHasRequestedRoute(false);
          return;
        }

        setSearchTerm(itinerary?.destination || "");
        setDestinationResults([]);
        setNearbyPlaces([]);
        setSelectedNearbyPlaceId("");
        setCurrentLocation(null);
        setItineraryStops(stops);
        setSelectedDestination(stops[0]);
        setNearbySource("itinerary");
        setTrayOpen(true);
        setRouteOpen(true);
        setMapFocusTarget({
          id: stops[0].id,
          type: "location",
          lat: stops[0].lat,
          lng: stops[0].lng,
          zoom: 13,
        });
        setToast(`Showing Day ${initialItineraryDay} route`);
        setHasRequestedRoute(stops.length > 1);
        if (stops.length < 2) setRoute(null);
      } catch (err) {
        if (!active) return;
        setRouteError(err?.response?.data?.message || "Failed to load itinerary day route.");
      } finally {
        if (active) setLoadingItineraryRoute(false);
      }
    };

    loadItineraryDayRoute();
    return () => {
      active = false;
    };
  }, [initialItineraryDay, initialItineraryId]);

  const popupRenderer = (locationItem, index) => (
    <div className="explorer-popup-card">
      {locationItem.image ? (
        <img
          src={locationItem.image}
          alt={locationItem.name}
          className="explorer-popup-card__image"
        />
      ) : null}
      <div>
        <p className="explorer-popup-card__eyebrow">
          {locationItem.kind === "origin" ? "Start location" : `Stop ${index}`}
        </p>
        <h3 className="explorer-popup-card__title">{locationItem.name}</h3>
        <p className="explorer-popup-card__meta">
          {[locationItem.categoryLabel || formatCategory(locationItem.category), locationItem.district, locationItem.province]
            .filter(Boolean)
            .join(" • ")}
        </p>
      </div>
      <div className="explorer-popup-card__tags">
        {locationItem.rating ? <span>Star {locationItem.rating}</span> : null}
        {locationItem.visitTime ? <span>{locationItem.visitTime}</span> : null}
        {locationItem.averageCost ? <span>NPR {Number(locationItem.averageCost).toLocaleString()}</span> : null}
      </div>
      <div className="explorer-popup-card__actions">
        {buildMapLink(locationItem) ? (
          <a
            href={buildMapLink(locationItem)}
            target="_blank"
            rel="noreferrer"
            className="explorer-popup-card__link"
          >
            Open in Maps
          </a>
        ) : null}
        {locationItem.kind !== "origin" ? (
          <button
            type="button"
            className="explorer-popup-card__link explorer-popup-card__link--button"
            onClick={() => addStopToItinerary(locationItem)}
          >
            Add to route
          </button>
        ) : null}
      </div>
    </div>
  );

  const nearbyPopupRenderer = (place) => (
    <div className="explorer-popup-card">
      {place.photo ? (
        <img
          src={place.photo}
          alt={place.name}
          className="explorer-popup-card__image"
        />
      ) : null}
      <div>
        <p className="explorer-popup-card__eyebrow">Nearby pick</p>
        <h3 className="explorer-popup-card__title">{place.name}</h3>
        <p className="explorer-popup-card__meta">{place.address || "Address unavailable"}</p>
      </div>
      <div className="explorer-popup-card__tags">
        <span>Star {Number(place.rating || 0).toFixed(1)}</span>
        {Number.isFinite(Number(place.distanceKm)) ? <span>{Number(place.distanceKm).toFixed(1)} km away</span> : null}
        {place.userRatingCount ? <span>{place.userRatingCount} reviews</span> : null}
        {formatPriceLevel(place.priceLevel) ? <span>{formatPriceLevel(place.priceLevel)}</span> : null}
        {typeof place.isOpenNow === "boolean" ? <span>{place.isOpenNow ? "Open now" : "Closed now"}</span> : null}
      </div>
      <div className="explorer-popup-card__actions">
        {buildMapLink({ name: place.name, lat: place.location?.lat, lng: place.location?.lng, mapUri: place.mapUri }) ? (
          <a
            href={buildMapLink({ name: place.name, lat: place.location?.lat, lng: place.location?.lng, mapUri: place.mapUri })}
            target="_blank"
            rel="noreferrer"
            className="explorer-popup-card__link"
          >
            Open in Maps
          </a>
        ) : null}
        <button
          type="button"
          className="explorer-popup-card__link explorer-popup-card__link--button"
          onClick={() => addStopToItinerary(normalizeNearbyToStop(place, nearbyType))}
        >
          Add to route
        </button>
      </div>
    </div>
  );

  return (
    <div className="explorer-page">
      <div className="explorer-page__map">
        <TravelMapCanvas
          center={mapCenter}
          zoom={selectedDestination || currentLocation ? 10 : DEFAULT_ZOOM}
          locations={mapStops}
          nearbyPlaces={filteredNearbyPlaces}
          routeCoordinates={route?.coordinates ?? []}
          highlightCenter={selectedDestination ? [selectedDestination.lat, selectedDestination.lng] : null}
          highlightRadiusMeters={highlightRadiusMeters}
          markerLabelPrefix="Stop"
          selectedLocationId={selectedLocationId}
          selectedNearbyPlaceId={selectedNearbyPlaceId}
          focusTarget={mapFocusTarget}
          onLocationSelect={(locationItem) => {
            const foundStop = activeTripStops.find((stop) => stop.id === locationItem.id);
            if (foundStop && foundStop.kind !== "nearby") setSelectedDestination(foundStop);
          }}
          onNearbyPlaceSelect={handleSelectNearbyPlace}
          onAddNearbyPlace={(place) => addStopToItinerary(normalizeNearbyToStop(place, nearbyType))}
          autoOpenLocationId={undefined}
          renderLocationPopup={popupRenderer}
          renderNearbyPopup={nearbyPopupRenderer}
        />
        <div className="explorer-page__overlay" />
      </div>

      <div className="explorer-topbar">
        <div className="explorer-topbar__left">
          <GlassButton type="button" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" />Back</GlassButton>
          <Link to="/dashboard" className="explorer-primary-link">Dashboard</Link>
        </div>

        <div className="explorer-search-shell">
          <div className="explorer-search-bar">
            <Search className="h-5 w-5 text-slate-400" />
            <div className="explorer-search-input-wrap">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search Pokhara, Lumbini, Chitwan, temples, lakes..."
              />
              {searchTerm ? (
                <button
                  type="button"
                  className="explorer-search-clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <span className="explorer-search-clear__glyph">x</span>
                </button>
              ) : null}
            </div>
            <button type="button" onClick={() => runDestinationSearch(searchTerm)}>Search</button>
          </div>
          <div className="explorer-chip-row">
            {NEARBY_TYPES.map((type) => {
              const TypeIcon = type.icon;
              return (
                <FloatingChip
                  key={type.value}
                  active={nearbyType === type.value}
                  onClick={() => handleNearbyTypeChange(type.value)}
                >
                  <TypeIcon className="h-3.5 w-3.5" />
                  {type.label}
                </FloatingChip>
              );
            })}
            <FilterMenu
              label="Rating"
              valueLabel={ratingLabel}
              isOpen={openFilterMenu === "rating"}
              onToggle={() => setOpenFilterMenu((current) => (current === "rating" ? "" : "rating"))}
              onSelect={(value) => {
                setRatingFilter(value);
                setOpenFilterMenu("");
              }}
              options={[
                { value: "all", label: "Any rating", active: ratingFilter === "all" },
                { value: "4.8", label: "4.8 and above", active: ratingFilter === "4.8" },
                { value: "4.6", label: "4.6 and above", active: ratingFilter === "4.6" },
                { value: "4.4", label: "4.4 and above", active: ratingFilter === "4.4" },
              ]}
            />
            <FilterMenu
              label="Distance"
              valueLabel={distanceLabel}
              isOpen={openFilterMenu === "distance"}
              onToggle={() => setOpenFilterMenu((current) => (current === "distance" ? "" : "distance"))}
              onSelect={(value) => {
                setDistanceFilter(value);
                setOpenFilterMenu("");
              }}
              options={[
                { value: "all", label: "Any distance", active: distanceFilter === "all" },
                { value: "25", label: "Within 25 km", active: distanceFilter === "25" },
                { value: "50", label: "Within 50 km", active: distanceFilter === "50" },
                { value: "100", label: "Within 100 km", active: distanceFilter === "100" },
              ]}
            />
            {activeFilterCount ? (
              <button
                type="button"
                className="explorer-filter-reset"
                onClick={() => {
                  setRatingFilter("all");
                  setDistanceFilter("all");
                  setOpenFilterMenu("");
                  setToast("Filters cleared");
                }}
              >
                Reset filters
              </button>
            ) : null}
          </div>
          {nearbyStatus.tone !== "neutral" ? (
            <div className={`explorer-status-banner explorer-status-banner--${nearbyStatus.tone}`}>
              {nearbyStatus.message}
            </div>
          ) : null}
          {searchError ? <p className="explorer-error">{searchError}</p> : null}
        </div>
      </div>

      {!routeOpen ? (
        <button type="button" onClick={() => setRouteOpen(true)} className="explorer-route-toggle" aria-label="Open route panel">
          <ChevronLeft className="h-4 w-4 explorer-route-toggle__icon" />
        </button>
      ) : null}

      <aside className={`explorer-route-panel ${routeOpen ? "is-open" : ""}`}>
        <div className="explorer-route-panel__head">
          <div>
            <p className="explorer-eyebrow">Route Planner</p>
            <h2>Trip Route</h2>
          </div>
          <button type="button" onClick={() => setRouteOpen(false)} className="explorer-icon-button"><X className="h-4 w-4" /></button>
        </div>

        <div className="explorer-metric-grid">
          <div><p>Distance</p><h3>{route ? formatDistance(route.distance) : "--"}</h3></div>
          <div><p>Travel Time</p><h3>{route ? formatDuration(route.duration) : "--"}</h3></div>
          <div><p>Estimated Cost</p><h3>{estimatedCost}</h3></div>
          <div><p>Source</p><h3>{nearbySource === "local_fallback" ? "Smart Travel" : nearbySource ? "Live nearby" : "Waiting"}</h3></div>
        </div>

        {selectedDestination ? (
          <div className="explorer-focus-panel">
            <div>
              <p className="explorer-eyebrow">Active destination</p>
              <h3>{selectedDestination.name}</h3>
              <small>
                {[selectedDestination.categoryLabel || formatCategory(selectedDestination.category), selectedDestination.district, selectedDestination.province]
                  .filter(Boolean)
                  .join(" • ")}
              </small>
            </div>
            {currentSelectionMapUri ? (
              <a href={currentSelectionMapUri} target="_blank" rel="noreferrer" className="explorer-focus-panel__link">
                <ExternalLink className="h-4 w-4" />
                Open
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="explorer-mode-row">
          <button
            type="button"
            className={travelMode === "driving-car" ? "is-active" : ""}
            onClick={() => {
              setTravelMode("driving-car");
              setToast("Driving mode selected");
            }}
          >
            <span>Drive</span>
            <small>{travelMode === "driving-car" ? "Selected" : "Faster routes"}</small>
          </button>
          <button
            type="button"
            className={travelMode === "foot-walking" ? "is-active" : ""}
            onClick={() => {
              setTravelMode("foot-walking");
              setToast("Walking mode selected");
            }}
          >
            <span>Walk</span>
            <small>{travelMode === "foot-walking" ? "Selected" : "Short local trips"}</small>
          </button>
        </div>

        <div className="explorer-list-block">
          <p className="explorer-eyebrow">Timeline</p>
          {activeTripStops.length ? activeTripStops.map((stop, index) => (
            <div
              key={stop.id}
              className={`explorer-list-item ${draggedStopId === stop.id ? "is-dragging" : ""}`}
              draggable
              onDragStart={() => setDraggedStopId(stop.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                handleReorderStop(draggedStopId, stop.id);
                setDraggedStopId("");
              }}
              onDragEnd={() => setDraggedStopId("")}
            >
              <div>
                <span>Stop {index + 1}</span>
                <strong>{stop.name}</strong>
                <small>{stop.categoryLabel || stop.category}</small>
              </div>
              <div className="explorer-list-item__actions">
                <span className="explorer-list-item__drag"><GripVertical className="h-4 w-4" />Drag</span>
                {buildMapLink(stop) ? (
                  <a href={buildMapLink(stop)} target="_blank" rel="noreferrer" className="explorer-list-item__link">
                    Open
                  </a>
                ) : null}
                <button type="button" onClick={() => handleRemoveStop(stop.id)}>Remove</button>
              </div>
            </div>
          )) : <div className="explorer-empty">Add stops from the tray below.</div>}
        </div>

        {routeError ? <p className="explorer-error">{routeError}</p> : null}
      </aside>

      <div className="explorer-fab-stack">
        <button type="button" className="explorer-fab" onClick={handleUseCurrentLocation} disabled={loadingCurrentLocation}><LocateFixed className="h-4 w-4" />{loadingCurrentLocation ? "Locating..." : "Locate me"}</button>
        <button type="button" className="explorer-fab explorer-fab--primary" onClick={fetchRoute}><Route className="h-4 w-4" />{loadingRoute ? "Routing..." : "Generate route"}</button>
        <button type="button" className="explorer-fab" onClick={handleResetMap}><Compass className="h-4 w-4" />Reset</button>
      </div>

      <section className={`explorer-tray ${trayOpen ? "is-open" : ""}`}>
        <div className="explorer-tray__shell">
          <button type="button" className="explorer-tray__toggle" onClick={() => setTrayOpen((current) => !current)}>
            <div className="explorer-tray__toggle-copy">
              <span className="explorer-tray__handle" />
              <div>
                <p className="explorer-eyebrow">Discover</p>
                <h2>{selectedDestination ? `${selectedDestination.name} and nearby picks` : "Search results and nearby picks"}</h2>
              </div>
            </div>
            <ChevronLeft className={`h-4 w-4 explorer-route-toggle__icon ${trayOpen ? "" : "is-closed"}`} />
          </button>

          <div className="explorer-tray__body">
            <div className="explorer-pill-row explorer-pill-row--stats">
              <span><MapPin className="h-3.5 w-3.5" /> {filteredDestinations.length} destinations</span>
              <span><Sparkles className="h-3.5 w-3.5" /> {filteredNearbyPlaces.length} nearby</span>
              <span><Timer className="h-3.5 w-3.5" /> {activeTripStops.length} route stops</span>
            </div>

            <section className="explorer-section">
              <div className="explorer-section__head">
                <h3>Destinations</h3>
              </div>
              <div className="explorer-scroll-row">
                {filteredDestinations.length ? filteredDestinations.map((item) => (
                  <DestinationCard
                    key={item.id}
                    item={item}
                    isActive={selectedDestination?.id === item.id}
                    onSelect={handleSelectDestination}
                    onAdd={addStopToItinerary}
                  />
                )) : <div className="explorer-empty">Search a destination to show cards.</div>}
              </div>
            </section>

            <section className="explorer-section">
              <div className="explorer-section__head">
                <h3>{nearbyTypeLabel}</h3>
              </div>
              <div className="explorer-scroll-row">
                {filteredNearbyPlaces.length ? filteredNearbyPlaces.map((place) => (
                  <NearbyCard
                    key={place.placeId}
                    place={place}
                    onSelect={handleSelectNearbyPlace}
                    onAdd={(item) => addStopToItinerary(normalizeNearbyToStop(item, nearbyType))}
                  />
                )) : <div className="explorer-empty">Select a destination to load nearby stops.</div>}
              </div>
            </section>
          </div>
        </div>
      </section>

      {toast ? <div className="explorer-toast">{toast}</div> : null}
    </div>
  );
}
