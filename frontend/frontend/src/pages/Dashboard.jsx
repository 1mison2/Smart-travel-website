import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  CreditCard,
  Droplets,
  Flame,
  Heart,
  Hotel,
  LogOut,
  MapPin,
  Mountain,
  MountainSnow,
  Navigation,
  Pin,
  PlaneTakeoff,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Trees,
  Umbrella,
  User,
  UserCircle,
  Users,
  Wallet,
  Wind,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api, { resolveImageUrl } from "../utils/api";
import "./Dashboard.css";

const DESTINATIONS_CACHE_KEY = "st_dashboard_destinations";
const NOTIFICATION_POLL_MS = 15000;

const readCachedDestinations = () => {
  try {
    const raw = sessionStorage.getItem(DESTINATIONS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const daysBetween = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const formatDate = (value, options = { month: "short", day: "numeric", year: "numeric" }) => {
  if (!value) return "TBD";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "TBD";
  return new Intl.DateTimeFormat("en-US", options).format(date);
};

const initialsFromName = (name) =>
  String(name || "Traveler")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const hasRealImage = (value) => Boolean(resolveImageUrl(value));
const safeNumber = (value, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};
const scenicGradients = [
  "linear-gradient(135deg, rgba(14, 53, 88, 0.95), rgba(64, 131, 181, 0.72))",
  "linear-gradient(135deg, rgba(12, 72, 94, 0.94), rgba(111, 179, 167, 0.74))",
  "linear-gradient(135deg, rgba(59, 68, 119, 0.94), rgba(227, 146, 102, 0.74))",
];
const fallbackDestinationMeta = [
  { rating: 4.9, tags: ["Viewpoint", "Boating", "Lakeside"], blurb: "Golden light, reflective waters, and serene premium escapes that feel effortless to plan." },
  { rating: 4.8, tags: ["Temple", "Culture", "Sunrise"], blurb: "Historic landmarks, atmospheric streets, and meaningful local moments in every direction." },
  { rating: 4.7, tags: ["Wildlife", "Safari", "Nature"], blurb: "Immersive landscapes, warm stays, and memorable outdoor experiences worth saving for later." },
];
const mapFallbackAttractions = ["Sarangkot", "World Peace Pagoda", "Phewa Lake"];
const savedPlaceNotes = ["Sunrise view", "Cultural stay", "Lake escape"];

const mapLocationSummary = (location, index = 0) => ({
  id: location?._id || `${location?.name || "destination"}-${index}`,
  locationId: location?._id || "",
  name: location?.name || "Destination",
  district: location?.district || "",
  province: location?.province || "",
  latitude: location?.latitude || location?.lat || "",
  longitude: location?.longitude || location?.lng || "",
  category: location?.category || "Travel Spot",
  description:
    location?.description ||
    "A beautiful stop for mountain views, local culture, and slow unforgettable moments.",
  tag:
    [location?.district, location?.province, location?.category].filter(Boolean).join(" / ") ||
    "Travel Spot",
  image: resolveImageUrl(location?.image || location?.images?.[0] || ""),
});

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPulse, setNotifPulse] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [itineraryLoading, setItineraryLoading] = useState(true);
  const [itineraryError, setItineraryError] = useState("");
  const [liveDestinations, setLiveDestinations] = useState(() => readCachedDestinations());
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [destinationsError, setDestinationsError] = useState("");
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState("");
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [savedPlacesLoading, setSavedPlacesLoading] = useState(true);
  const [savedPlacesError, setSavedPlacesError] = useState("");
  const [savingLocationIds, setSavingLocationIds] = useState([]);
  const [buddyCards, setBuddyCards] = useState([]);
  const [buddyCardsLoading, setBuddyCardsLoading] = useState(true);
  const [buddyCardsError, setBuddyCardsError] = useState("");

  const searchDebounceRef = useRef(null);
  const searchBlurRef = useRef(null);
  const unreadCountRef = useRef(0);
  const pulseTimerRef = useRef(null);

  const displayName = user?.name || user?.fullName || "Traveler";

  const loadDestinations = useCallback(async () => {
    try {
      setDestinationsLoading(true);
      setDestinationsError("");
      const { data } = await api.get("/api/locations");
      const mapped = (Array.isArray(data) ? data : []).map((location, index) => ({
        id: location._id || `${location.name}-${index}`,
        locationId: location._id || "",
        name: location.name || "Destination",
        district: location.district || "",
        province: location.province || "",
        latitude: location.latitude || location.lat || "",
        longitude: location.longitude || location.lng || "",
        category: location.category || "Travel Spot",
        description:
          location.description ||
          "A beautiful stop for mountain views, local culture, and slow unforgettable moments.",
        tag:
          [location.district, location.province, location.category].filter(Boolean).join(" • ") ||
          "Travel Spot",
        image: resolveImageUrl(location.image || location.images?.[0] || ""),
      }));
      setLiveDestinations(mapped);
      sessionStorage.setItem(DESTINATIONS_CACHE_KEY, JSON.stringify(mapped));
    } catch (err) {
      setDestinationsError(err?.response?.data?.message || "Unable to refresh destinations right now.");
    } finally {
      setDestinationsLoading(false);
    }
  }, []);

  const loadSavedPlaces = useCallback(async () => {
    if (!user?._id) {
      setSavedPlaces([]);
      setSavedPlacesLoading(false);
      setSavedPlacesError("");
      return;
    }

    try {
      setSavedPlacesLoading(true);
      setSavedPlacesError("");
      const { data } = await api.get("/api/locations/saved/me");
      const mapped = (Array.isArray(data?.savedLocations) ? data.savedLocations : []).map((location, index) => ({
        ...mapLocationSummary(location, index),
        note: savedPlaceNotes[index] || location?.category || "Must visit",
      }));
      setSavedPlaces(mapped);
    } catch (err) {
      setSavedPlaces([]);
      setSavedPlacesError(err?.response?.data?.message || "Unable to load saved places right now.");
    } finally {
      setSavedPlacesLoading(false);
    }
  }, [user?._id]);

  const loadTrips = useCallback(async () => {
    try {
      setTripsLoading(true);
      setTripsError("");
      const { data } = await api.get("/api/user/recent-trips");
      setTrips(Array.isArray(data?.trips) ? data.trips : []);
    } catch (err) {
      setTripsError(err?.response?.data?.message || "Unable to load your trips right now.");
      setTrips([]);
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const loadItinerary = useCallback(async () => {
    try {
      setItineraryLoading(true);
      setItineraryError("");
      const { data } = await api.get("/api/itineraries/me");
      const list = Array.isArray(data?.itineraries) ? data.itineraries : [];
      setItinerary(list[0] || null);
    } catch (err) {
      setItineraryError(err?.response?.data?.message || "Unable to load itinerary right now.");
      setItinerary(null);
    } finally {
      setItineraryLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);
      setBookingsError("");
      const { data } = await api.get("/api/bookings/me");
      setBookings(Array.isArray(data?.bookings) ? data.bookings : []);
    } catch (err) {
      setBookingsError(err?.response?.data?.message || "Unable to load booking totals right now.");
      setBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  const loadPayments = useCallback(async () => {
    try {
      setPaymentsLoading(true);
      setPaymentsError("");
      const { data } = await api.get("/api/payments/me");
      setPayments(Array.isArray(data?.payments) ? data.payments : []);
    } catch (err) {
      setPaymentsError(err?.response?.data?.message || "Unable to load payment totals right now.");
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  const loadBuddyCards = useCallback(async () => {
    if (!user?._id) {
      setBuddyCards([]);
      setBuddyCardsLoading(false);
      setBuddyCardsError("");
      return;
    }

    const makeStatusLabel = (request, isReceiver) => {
      if (request?.status === "accepted") return "Chat ready";
      if (request?.status === "rejected") return "Request declined";
      if (request?.status === "cancelled") return "Request cancelled";
      if (isReceiver) return "Request waiting for you";
      return "Request pending";
    };

    try {
      setBuddyCardsLoading(true);
      setBuddyCardsError("");
      const { data } = await api.get("/api/buddy/requests");
      const next = new Map();

      (Array.isArray(data?.chatRooms) ? data.chatRooms : []).forEach((room, index) => {
        const other = (room?.participants || []).find((participant) => participant?._id !== user._id);
        if (!other?._id) return;
        next.set(other._id, {
          id: other._id,
          name: other.name || "Traveler",
          plan: room?.travelPlanId?.destination || "Travel chat",
          status: "Chat available",
          priority: 3,
          order: index,
        });
      });

      (Array.isArray(data?.buddyRequests) ? data.buddyRequests : []).forEach((request, index) => {
        const isReceiver = request?.receiverId?._id === user._id;
        const other = isReceiver ? request?.senderId : request?.receiverId;
        if (!other?._id) return;
        const existing = next.get(other._id);
        const candidate = {
          id: other._id,
          name: other.name || "Traveler",
          plan:
            request?.travelPlanId?.destination ||
            request?.receiverPlanId?.destination ||
            request?.senderPlanId?.destination ||
            "Travel plan",
          status: makeStatusLabel(request, isReceiver),
          priority: request?.status === "accepted" ? 2 : 1,
          order: index,
        };
        if (!existing || candidate.priority > existing.priority) {
          next.set(other._id, candidate);
        }
      });

      setBuddyCards(
        [...next.values()]
          .sort((a, b) => b.priority - a.priority || a.order - b.order)
          .slice(0, 3)
      );
    } catch (err) {
      setBuddyCards([]);
      setBuddyCardsError(err?.response?.data?.message || "Unable to load travel buddies right now.");
    } finally {
      setBuddyCardsLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    loadDestinations();
    loadTrips();
    loadItinerary();
    loadBookings();
    loadPayments();
  }, [loadDestinations, loadTrips, loadItinerary, loadBookings, loadPayments]);

  useEffect(() => {
    loadSavedPlaces();
  }, [loadSavedPlaces]);

  useEffect(() => {
    loadBuddyCards();
  }, [loadBuddyCards]);

  useEffect(() => {
    if (!user?._id) return undefined;
    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get("/api/notifications/me?limit=4");
        if (!active) return;
        const count = Number(data?.unreadCount || 0);
        if (count > unreadCountRef.current) {
          setNotifPulse(true);
          if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
          pulseTimerRef.current = setTimeout(() => setNotifPulse(false), 4000);
        }
        unreadCountRef.current = count;
        setUnreadCount(count);
      } catch {
        // ignore polling errors
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, NOTIFICATION_POLL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, [user?._id]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!term) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");
        const { data } = await api.get(`/api/places/search?query=${encodeURIComponent(term)}`);
        setSearchResults((Array.isArray(data?.results) ? data.results : []).slice(0, 6));
      } catch (err) {
        setSearchError(err?.response?.data?.message || "Search failed. Try again.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  const sortedTrips = [...trips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const now = new Date();
  const upcomingTrip = sortedTrips.find((trip) => new Date(trip.startDate) >= now) || sortedTrips[0] || null;
  const daysUntilNextTrip = upcomingTrip ? daysBetween(now, upcomingTrip.startDate) : null;
  const tripHistory = [...trips].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)).slice(0, 4);
  const itineraryDays = Array.isArray(itinerary?.days) ? itinerary.days.slice(0, 4) : [];
  const recommendedDestinations = liveDestinations.slice(0, 3).map((destination, index) => {
    const fallback = fallbackDestinationMeta[index % fallbackDestinationMeta.length];
    return {
      ...destination,
      rating: fallback.rating,
      tags: destination.category ? [destination.category, ...fallback.tags].slice(0, 3) : fallback.tags,
      shortLocation: [destination.district, destination.province].filter(Boolean).join(", ") || "Nepal",
      blurb:
        destination.description && destination.description.length <= 150
          ? destination.description
          : fallback.blurb,
      scenicBackground: scenicGradients[index % scenicGradients.length],
    };
  });
  const savedLocationIds = new Set(savedPlaces.map((place) => place.locationId || place.id));
  const totalBookedAmount = bookings.reduce((sum, booking) => sum + Number(booking?.amount || 0), 0);
  const totalPaidAmount = payments
    .filter((payment) => payment?.status === "success")
    .reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
  const totalPendingAmount = bookings
    .filter((booking) => booking?.paymentStatus === "pending")
    .reduce((sum, booking) => sum + Number(booking?.amount || 0), 0);
  const confirmedBookings = bookings.filter((booking) => booking?.bookingStatus === "confirmed").length;
  const upcomingBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking?.checkIn || booking?.travelDate || booking?.createdAt || 0);
    return !Number.isNaN(bookingDate.getTime()) && bookingDate >= now;
  }).length;
  const budgetBarPercent = totalBookedAmount > 0 ? Math.max(18, Math.min(100, Math.round((totalPaidAmount / totalBookedAmount) * 100))) : 24;
  const budgetLoading = bookingsLoading || paymentsLoading;
  const budgetError = bookingsError || paymentsError;

  const getTripImage = (trip) => {
    if (!trip) return "";
    const title = normalizeText(trip.title);
    const matched = liveDestinations.find((destination) => {
      const placeName = normalizeText(destination.name);
      return placeName && (title.includes(placeName) || placeName.includes(title));
    });
    return matched?.image || "";
  };

  const weather = {
    label: upcomingTrip ? "Pokhara valley" : "Kathmandu",
    temp: upcomingTrip ? "18°C" : "21°C",
    summary: "Clear sky and mountain light",
  };

  const weatherDetails = {
    humidity: upcomingTrip ? "65%" : "58%",
    wind: upcomingTrip ? "6 km/h" : "9 km/h",
    icon: upcomingTrip ? Sun : MountainSnow,
  };

  const nearbyActivities = [
    { icon: Trees, title: "Forest hikes", detail: "Shivapuri ridge trails and pine walks." },
    { icon: Sunrise, title: "Sunrise points", detail: "Sarangkot and Nagarkot golden-hour stops." },
    { icon: Umbrella, title: "Boating escapes", detail: "Phewa Lake and calm waterfront cafes." },
    { icon: Flame, title: "Local food finds", detail: "Thakali kitchens, rooftop brunch, and momo spots." },
  ];

  const heroImage = getTripImage(upcomingTrip);
  const heroDestination =
    recommendedDestinations.find((item) => hasRealImage(item?.image)) ||
    liveDestinations.find((item) => hasRealImage(item?.image)) ||
    recommendedDestinations[0] ||
    liveDestinations[0] ||
    null;
  const heroVisualImage = heroImage || heroDestination?.image || "";
  const heroLocationLabel =
    heroDestination?.tag ||
    [heroDestination?.district, heroDestination?.province].filter(Boolean).join(" • ") ||
    "Nepal travel";
  const heroMapHref =
    heroDestination?.latitude && heroDestination?.longitude
      ? `/map-explorer?lat=${encodeURIComponent(heroDestination.latitude)}&lng=${encodeURIComponent(heroDestination.longitude)}&type=tourist_attraction`
      : "/map-explorer";
  const statsCards = [
    { icon: PlaneTakeoff, label: "Trips Planned", value: trips.length, accent: "sky" },
    { icon: Star, label: "Saved Destinations", value: savedPlaces.length, accent: "gold" },
    { icon: CreditCard, label: "Upcoming Bookings", value: upcomingBookings, accent: "coral" },
    {
      icon: Compass,
      label: "Activities Completed",
      value: Math.max(
        tripHistory.filter((trip) => new Date(trip?.endDate) < now).length * 2,
        safeNumber(itinerary?.days?.reduce((sum, day) => sum + (day?.places?.length || 0), 0), 0)
      ),
      accent: "mint",
    },
  ];
  const tripPreviewMeta = [
    { label: "Trip pace", value: itineraryDays.length > 2 ? "Balanced" : "Easy" },
    { label: "Best window", value: upcomingTrip ? formatDate(upcomingTrip.startDate, { month: "short", day: "numeric" }) : "Anytime" },
    { label: "Travel style", value: "Scenic premium" },
  ];
  const mapHighlights =
    normalizeText(heroDestination?.name).includes("pokhara")
      ? mapFallbackAttractions
      : [heroDestination?.name, heroDestination?.district, "Nearby viewpoints"].filter(Boolean).slice(0, 3);

  const goToDestinationHub = (locationId) => {
    if (locationId) {
      navigate(`/locations/${locationId}`);
      return;
    }
    navigate("/explore");
  };

  const onDashboardSearch = (event) => {
    event.preventDefault();
    if (!searchTerm.trim()) return;
    if (searchResults.length === 1) {
      goToDestinationHub(searchResults[0]?.id);
      return;
    }
    navigate("/destination-search");
  };

  const handleSearchFocus = () => {
    if (searchBlurRef.current) clearTimeout(searchBlurRef.current);
    setSearchFocused(true);
  };

  const handleSearchBlur = () => {
    searchBlurRef.current = setTimeout(() => setSearchFocused(false), 120);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const toggleSavedPlace = async (locationId, shouldSave) => {
    if (!locationId) return;

    try {
      setSavingLocationIds((current) => [...current, locationId]);
      setSavedPlacesError("");
      if (shouldSave) {
        await api.post(`/api/locations/${locationId}/save`);
      } else {
        await api.delete(`/api/locations/${locationId}/save`);
      }
      await loadSavedPlaces();
    } catch (err) {
      setSavedPlacesError(
        err?.response?.data?.message ||
          `Unable to ${shouldSave ? "save" : "remove"} this place right now.`
      );
    } finally {
      setSavingLocationIds((current) => current.filter((id) => id !== locationId));
    }
  };

  const WeatherIcon = weatherDetails.icon;

  return (
    <div className="travel-dashboard">
      <div className="travel-dashboard__ambient travel-dashboard__ambient--one" />
      <div className="travel-dashboard__ambient travel-dashboard__ambient--two" />

      <div className="travel-dashboard__shell">
        <header className="travel-topbar">
          <button type="button" className="travel-brand" onClick={() => navigate("/dashboard")}>
            <span className="travel-brand__mark"><Mountain size={18} /></span>
            <span>
              <strong>Smart Travel Nepal</strong>
            </span>
          </button>

          <nav className="travel-topbar__nav" aria-label="Primary">
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/my-trips")}><Calendar size={15} />My Trips</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/explore")}><Mountain size={15} />Explore</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/bookings")}><Wallet size={15} />Bookings</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/trip-packages")}><Sparkles size={15} />Packages</button>
          </nav>

          <form className="travel-search" onSubmit={onDashboardSearch}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search destinations, stays, sunrise spots..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            {searchFocused && (searchLoading || searchError || searchResults.length > 0) && (
              <div className="travel-search__dropdown">
                {searchLoading && <div className="travel-search__row">Searching beautiful places...</div>}
                {!searchLoading && searchError && <div className="travel-search__row">{searchError}</div>}
                {!searchLoading && !searchError && searchResults.length === 0 && <div className="travel-search__row">No matching places found yet.</div>}
                {!searchLoading && !searchError && searchResults.length > 0 && (
                  <ul className="travel-search__list">
                    {searchResults.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          className="travel-search__result"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goToDestinationHub(result.id)}
                        >
                          <span>{result.name}</span>
                          <small>{[result.district, result.province, result.category].filter(Boolean).join(" • ")}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>

          <div className="travel-topbar__actions">
            <button
              type="button"
              className={`travel-icon-btn ${notifPulse ? "travel-icon-btn--pulse" : ""}`}
              aria-label="Notifications"
              onClick={() => {
                setNotifPulse(false);
                navigate("/notifications");
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="travel-icon-btn__badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </button>

            <div className="travel-profile">
              <button type="button" className="travel-profile__trigger" onClick={() => setShowProfileMenu((prev) => !prev)}>
                <span className="travel-profile__avatar">{initialsFromName(displayName)}</span>
                <span className="travel-profile__text">
                  <strong>{displayName}</strong>
                  <small>Explorer</small>
                </span>
              </button>

              {showProfileMenu && (
                <div className="travel-profile__menu">
                  <div className="travel-profile__menu-head">
                    <div className="travel-profile__menu-avatar"><UserCircle size={28} /></div>
                    <div>
                      <strong>{displayName}</strong>
                      <small>{user?.email || "traveler@smarttravel.com"}</small>
                    </div>
                  </div>
                  <button type="button" className="travel-profile__item" onClick={() => navigate("/profile")}><User size={16} />Profile</button>
                  <button type="button" className="travel-profile__item" onClick={() => navigate("/settings")}><Settings size={16} />Settings</button>
                  <button type="button" className="travel-profile__item travel-profile__item--danger" onClick={handleLogout}><LogOut size={16} />Logout</button>
                </div>
              )}
            </div>

            <button type="button" className="travel-cta" onClick={() => navigate("/itinerary-planner")}>Plan New Trip</button>
          </div>
        </header>

        <section className="hero">
          <div className="hero__content">
            <h1>
              Design your next Nepal escape with
              <span> calm planning and confident next steps.</span>
            </h1>
            <div className="hero__highlights">
              <span><ShieldCheck size={14} />Trusted routes</span>
              <span><Sparkles size={14} />AI trip planning</span>
              <span><CheckCircle2 size={14} />Verified stays</span>
            </div>
            <div className="hero__actions">
              <button type="button" className="hero__primary" onClick={() => navigate("/explore")}>Explore Destinations</button>
              <button type="button" className="hero__secondary" onClick={() => navigate("/my-trips")}>View My Trips</button>
            </div>
            <div className="hero__stats">
              <div className="glass-card hero__stat"><span>Upcoming trip</span><strong>{upcomingTrip?.title || "No trip scheduled yet"}</strong></div>
              <div className="glass-card hero__stat"><span>Countdown</span><strong>{daysUntilNextTrip === null ? "Start planning" : `${daysUntilNextTrip} days left`}</strong></div>
              <div className="glass-card hero__stat"><span>Saved places</span><strong>{savedPlaces.length} ready to revisit</strong></div>
            </div>
          </div>

          <div className="hero__visual">
            <div className="hero__visual-shell" />
            {heroVisualImage ? (
              <img src={heroVisualImage} alt={upcomingTrip?.title || heroDestination?.name || "Scenic Nepal travel"} />
            ) : (
              <div className="hero__visual-empty">
                <strong>No posted destination image yet</strong>
                <span>Add a location image from admin to feature it here.</span>
              </div>
            )}
            <div className="hero__image-tint" />
            <div className="glass-card hero__overlay hero__overlay--location">
              <span>Destination</span>
              <strong>{heroDestination?.name || itinerary?.destination || "Nepal"}</strong>
              <small>{heroLocationLabel}</small>
            </div>
            <div className="glass-card hero__overlay hero__overlay--preview">
              <span>Trip preview</span>
              <strong>{upcomingTrip?.title || "Slow adventure itinerary"}</strong>
              <small>{daysUntilNextTrip === null ? "Ready when you are" : `${daysUntilNextTrip} days until departure`}</small>
            </div>
            <div className="glass-card hero__trip-preview">
              {tripPreviewMeta.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <main className="dashboard-grid__main">
            <section className="stats-strip">
              {statsCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.label} className={`stats-card stats-card--${card.accent}`}>
                    <span className="stats-card__icon"><Icon size={18} /></span>
                    <strong>{card.value}</strong>
                    <small>{card.label}</small>
                  </article>
                );
              })}
            </section>

            <section className="premium-card premium-card--trip">
              <div className="section-head">
                <div><p className="section-head__eyebrow">Upcoming Trip</p><h2>Your next escape</h2></div>
                <button type="button" className="section-head__link" onClick={() => navigate("/my-trips")}>Open trips</button>
              </div>

              {tripsLoading ? (
                <p className="dashboard-note">Loading your latest adventure...</p>
              ) : upcomingTrip ? (
                <div className="trip-focus">
                  <div className="trip-focus__image">
                    {getTripImage(upcomingTrip) ? (
                      <img src={getTripImage(upcomingTrip)} alt={upcomingTrip.title} />
                    ) : (
                      <div className="trip-focus__image-empty">
                        <strong>No posted trip image yet</strong>
                        <span>This card will use your uploaded destination image when available.</span>
                      </div>
                    )}
                  </div>
                  <div className="trip-focus__body">
                    <div className="trip-focus__chips">
                      <span>{formatDate(upcomingTrip.startDate)}</span>
                      <span>{daysUntilNextTrip >= 0 ? `${daysUntilNextTrip} days left` : "Trip in progress"}</span>
                    </div>
                    <h3>{upcomingTrip.title}</h3>
                    <p className="trip-focus__summary">
                      {upcomingTrip.summary || "A curated journey with scenic stays, memorable food stops, and enough breathing room to enjoy Nepal."}
                    </p>
                    <div className="trip-focus__meta">
                      <div><Calendar size={16} /><span>{formatDate(upcomingTrip.startDate)} - {formatDate(upcomingTrip.endDate)}</span></div>
                      <div><Wallet size={16} /><span>NPR {Number(upcomingTrip?.price || 0).toLocaleString()}</span></div>
                    </div>
                    <div className="trip-focus__actions">
                      <Link className="action-btn action-btn--primary" to={itinerary?._id ? `/itineraries/${itinerary._id}` : "/itinerary-planner"}>Quick View</Link>
                      <button type="button" className="action-btn action-btn--ghost" onClick={() => navigate("/itinerary-planner")}>Continue Planning</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p>No upcoming trips yet.</p>
                  <button type="button" className="action-btn action-btn--primary" onClick={() => navigate("/itinerary-planner")}>Plan your first journey</button>
                </div>
              )}
              {!tripsLoading && tripsError && <p className="dashboard-error">{tripsError}</p>}
            </section>

            <section className="premium-card">
              <div className="section-head">
                <div><p className="section-head__eyebrow">Current Itinerary</p><h2>Day-wise travel flow</h2></div>
                <button type="button" className="section-head__link" onClick={() => navigate("/itinerary-planner")}>AI regenerate</button>
              </div>

              {itineraryLoading ? (
                <p className="dashboard-note">Loading your current itinerary...</p>
              ) : itinerary ? (
                <div className="timeline">
                  {itineraryDays.map((day, index) => (
                    <div key={day.day || index} className="timeline__item">
                      <div className="timeline__rail">
                        <span className="timeline__dot" />
                        {index !== itineraryDays.length - 1 && <span className="timeline__line" />}
                      </div>
                      <div className="timeline__content">
                        <div className="timeline__head">
                          <div><strong>Day {day.day}</strong><h3>{day.title || "Explore at your own pace"}</h3></div>
                          <span>{itinerary.destination || "Nepal"}</span>
                        </div>
                        <p>{(day.places || []).map((place) => place.name).filter(Boolean).join(", ") || "Add scenic stops, food breaks, and hotel details to complete this day."}</p>
                        <div className="timeline__tags">
                          <span><Hotel size={14} />Hotel</span>
                          <span><Umbrella size={14} />Food</span>
                          <span><Compass size={14} />Transport</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state--left">
                  <p>No itinerary yet. Create one to unlock a smarter timeline.</p>
                  <button type="button" className="action-btn action-btn--primary" onClick={() => navigate("/itinerary-planner")}>Create itinerary</button>
                </div>
              )}
              {!itineraryLoading && itineraryError && <p className="dashboard-error">{itineraryError}</p>}
            </section>

            <section className="premium-card">
              <div className="section-head">
                <div><p className="section-head__eyebrow">Recommended Destinations</p><h2>Beautiful places to consider next</h2></div>
                <button type="button" className="section-head__link" onClick={() => navigate("/explore")}>See all</button>
              </div>
              {destinationsLoading ? (
                <p className="dashboard-note">Loading premium picks...</p>
              ) : (
                <div className="destination-grid">
                  {recommendedDestinations.map((destination) => (
                    <article
                      key={destination.id}
                      className="destination-card destination-card--interactive"
                      role="button"
                      tabIndex={0}
                      onClick={() => goToDestinationHub(destination.locationId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          goToDestinationHub(destination.locationId);
                        }
                      }}
                    >
                      <div className="destination-card__image">
                        {destination.image ? (
                          <img src={destination.image} alt={destination.name} />
                        ) : (
                          <div className="destination-card__fallback" style={{ background: destination.scenicBackground }}>
                            <strong>{destination.name}</strong>
                            <span>{destination.shortLocation}</span>
                          </div>
                        )}
                        <div className="destination-card__gradient" />
                        <span className="destination-card__tag">{destination.category}</span>
                        <div className="destination-card__rating"><Star size={14} fill="currentColor" />{destination.rating}</div>
                        <button
                          type="button"
                          className={`destination-card__save ${savedLocationIds.has(destination.locationId) ? "is-active" : ""}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSavedPlace(destination.locationId, !savedLocationIds.has(destination.locationId));
                          }}
                          disabled={savingLocationIds.includes(destination.locationId)}
                          aria-label={savedLocationIds.has(destination.locationId) ? `Remove ${destination.name} from saved places` : `Save ${destination.name}`}
                        >
                          <Heart size={16} fill={savedLocationIds.has(destination.locationId) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="destination-card__body">
                        <div>
                          <h3>{destination.name}</h3>
                          <p className="destination-card__location"><MapPin size={14} />{destination.shortLocation}</p>
                          <div className="destination-card__chips">
                            {destination.tags.map((tag) => <span key={tag}>{tag}</span>)}
                          </div>
                          <p className="destination-card__copy">{destination.blurb}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {!destinationsLoading && destinationsError && <p className="dashboard-error">{destinationsError}</p>}
            </section>

            <section className="premium-card">
              <div className="section-head">
                <div><p className="section-head__eyebrow">Nearby Activities</p><h2>Calm moments and adventure nearby</h2></div>
              </div>
              <div className="activity-grid">
                {nearbyActivities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <article key={activity.title} className="activity-card">
                      <span className="activity-card__icon"><Icon size={18} /></span>
                      <h3>{activity.title}</h3>
                      <p>{activity.detail}</p>
                      <small>Discover more</small>
                    </article>
                  );
                })}
              </div>
            </section>
          </main>

        <aside className="dashboard-grid__sidebar">
            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Saved Places</p><h2>Ready when you are</h2></div>
              </div>
              {savedPlacesLoading ? (
                <p className="dashboard-note">Loading saved places...</p>
              ) : savedPlaces.length > 0 ? (
                <div className="mini-list">
                  {savedPlaces.map((place) => (
                    <article key={place.id} className="mini-list__item">
                      {place.image ? (
                        <img src={place.image} alt={place.name} />
                      ) : (
                        <div className="mini-list__fallback" style={{ background: scenicGradients[0] }}>
                          <MapPin size={18} />
                        </div>
                      )}
                      <button type="button" className="mini-list__content" onClick={() => goToDestinationHub(place.locationId)}>
                        <div><strong>{place.name}</strong><small>{place.note}</small></div>
                      </button>
                      <span className="mini-list__actions">
                        <button
                          type="button"
                          className="mini-list__save"
                          onClick={() => toggleSavedPlace(place.locationId, false)}
                          disabled={savingLocationIds.includes(place.locationId)}
                          aria-label={`Remove ${place.name} from saved places`}
                        >
                          <Heart size={16} fill="currentColor" />
                        </button>
                        <button type="button" className="mini-list__open" onClick={() => goToDestinationHub(place.locationId)} aria-label={`Open ${place.name}`}>
                          <ChevronRight size={16} />
                        </button>
                      </span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state--left">
                  <p>Save places from the destination cards to see them here.</p>
                </div>
              )}
              {!savedPlacesLoading && savedPlacesError && <p className="dashboard-error">{savedPlacesError}</p>}
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Trip History</p><h2>Recent journeys</h2></div>
                <Clock3 size={18} />
              </div>
              <div className="history-list">
                {tripHistory.length > 0 ? (
                  tripHistory.map((trip) => (
                    <button
                      key={trip._id}
                      type="button"
                      className="history-list__item history-list__item--interactive"
                      onClick={() => navigate("/my-trips")}
                    >
                      <div className="history-list__content">
                        <strong>{trip.title}</strong>
                        <small>{formatDate(trip.startDate)}{trip.endDate ? ` - ${formatDate(trip.endDate)}` : ""}</small>
                      </div>
                      <span>{new Date(trip.endDate) < now ? "Completed" : "Upcoming"}</span>
                    </button>
                  ))
                ) : (
                  <div className="empty-state empty-state--left">
                    <p>Your recent trips will show up here once you start planning.</p>
                    <button type="button" className="action-btn action-btn--ghost" onClick={() => navigate("/itinerary-planner")}>
                      Plan a trip
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Spending Overview</p><h2>Spend with clarity</h2></div>
              </div>
              {budgetLoading ? (
                <p className="dashboard-note">Loading booking and payment totals...</p>
              ) : (
                <div className="budget-stack">
                  <div className="budget-stack__hero">
                    <strong>NPR {totalPaidAmount.toLocaleString()}</strong>
                    <span>already secured for upcoming travel</span>
                  </div>
                  <div className="budget-stack__row"><span><Wallet size={15} />Total booked</span><strong>NPR {totalBookedAmount.toLocaleString()}</strong></div>
                  <div className="budget-stack__row"><span><CheckCircle2 size={15} />Total paid</span><strong>NPR {totalPaidAmount.toLocaleString()}</strong></div>
                  <div className="budget-stack__row"><span><CreditCard size={15} />Pending payment</span><strong>NPR {totalPendingAmount.toLocaleString()}</strong></div>
                  <div className="budget-stack__row"><span><ShieldCheck size={15} />Confirmed bookings</span><strong>{confirmedBookings}</strong></div>
                  <div className="budget-stack__bar"><span style={{ width: `${budgetBarPercent}%` }} /></div>
                  <small>{totalBookedAmount > 0 ? `${budgetBarPercent}% of your booked value is already paid.` : "Book a stay or package to start tracking confirmed spend."}</small>
                </div>
              )}
              {!budgetLoading && budgetError && <p className="dashboard-error">{budgetError}</p>}
            </section>

            <section className="premium-card premium-card--compact map-card">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Nearby Attractions Map</p><h2>Preview what is around you</h2></div>
                <Navigation size={18} />
              </div>
              <div className="map-card__preview">
                <div className="map-card__glow map-card__glow--one" />
                <div className="map-card__glow map-card__glow--two" />
                <div className="map-card__grid" />
                <div className="map-card__route" />
                <div className="map-card__preview-head">
                  <span className="map-card__compass"><Navigation size={14} /></span>
                </div>
                {mapHighlights.slice(0, 3).map((item, index) => (
                  <div
                    key={item}
                    className={`map-card__marker map-card__marker--${["one", "two", "three"][index] || "one"}`}
                  >
                    <span className="map-card__pin"><Pin size={14} /></span>
                    <small>{item}</small>
                  </div>
                ))}
              </div>
              <div className="map-card__list">
                {mapHighlights.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <button type="button" className="action-btn action-btn--ghost map-card__cta" onClick={() => navigate(heroMapHref)}>
                Open full map
              </button>
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Travel Buddies</p><h2>Companions nearby</h2></div>
                <Users size={18} />
              </div>
              {buddyCardsLoading ? (
                <p className="dashboard-note">Loading your travel connections...</p>
              ) : buddyCards.length > 0 ? (
                <div className="buddy-list">
                  {buddyCards.map((buddy) => (
                    <div key={buddy.id} className="buddy-list__item">
                      <span className="buddy-list__avatar">{initialsFromName(buddy.name)}</span>
                      <div className="buddy-list__content">
                        <strong>{buddy.name}</strong>
                        <small>{buddy.plan}</small>
                        <p>{buddy.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state empty-state--left">
                  <p>No buddy connections yet. Start with Buddy Finder to see travelers here.</p>
                </div>
              )}
              {!buddyCardsLoading && buddyCardsError && <p className="dashboard-error">{buddyCardsError}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to="/buddy-finder#finder" className="action-btn action-btn--primary">
                  Open Buddy Finder
                </Link>
                <Link to="/buddy-finder#community" className="action-btn action-btn--ghost">
                  Open Community
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
