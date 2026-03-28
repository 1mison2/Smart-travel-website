import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Calendar,
  ChevronRight,
  Clock3,
  Compass,
  Hotel,
  LogOut,
  MapPin,
  Mountain,
  Search,
  Settings,
  Sun,
  Sunrise,
  Trees,
  Umbrella,
  User,
  UserCircle,
  Users,
  Wallet,
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

  useEffect(() => {
    loadDestinations();
    loadTrips();
    loadItinerary();
    loadBookings();
    loadPayments();
  }, [loadDestinations, loadTrips, loadItinerary, loadBookings, loadPayments]);

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
  const recommendedDestinations = liveDestinations.slice(0, 3);
  const savedPlaces = liveDestinations.slice(0, 3).map((place, index) => ({
    ...place,
    note: ["Sunrise view", "Cultural stay", "Lake escape"][index] || "Must visit",
  }));
  const totalBookedAmount = bookings.reduce((sum, booking) => sum + Number(booking?.amount || 0), 0);
  const totalPaidAmount = payments
    .filter((payment) => payment?.status === "success")
    .reduce((sum, payment) => sum + Number(payment?.amount || 0), 0);
  const totalPendingAmount = bookings
    .filter((booking) => booking?.paymentStatus === "pending")
    .reduce((sum, booking) => sum + Number(booking?.amount || 0), 0);
  const confirmedBookings = bookings.filter((booking) => booking?.bookingStatus === "confirmed").length;
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

  const nearbyActivities = [
    { icon: Trees, title: "Forest hikes", detail: "Shivapuri ridge trails and pine walks." },
    { icon: Sunrise, title: "Sunrise points", detail: "Sarangkot and Nagarkot golden-hour stops." },
    { icon: Umbrella, title: "Boating escapes", detail: "Phewa Lake and calm waterfront cafes." },
    { icon: Sun, title: "Local food finds", detail: "Thakali kitchens, rooftop brunch, and momo spots." },
  ];

  const travelBuddies = [
    { id: 1, name: "Aarav Tamang", plan: "Annapurna Base Camp", status: "Packing now" },
    { id: 2, name: "Maya Shrestha", plan: "Pokhara getaway", status: "Open to shared cab" },
    { id: 3, name: "Rinzin Lama", plan: "Upper Mustang road trip", status: "Looking for day hikers" },
  ];

  const notificationsPreview = [
    unreadCount > 0 ? `${unreadCount} unread updates are waiting for you.` : "Your dashboard is calm and fully synced.",
    upcomingTrip ? `Your ${upcomingTrip.title} plan is ready for the next review.` : "Start a new journey to unlock planning tips.",
    itinerary ? "AI itinerary suggestions are prepared for your next travel day." : "Generate an itinerary to get smarter timing suggestions.",
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
              <small>Plan with calm confidence</small>
            </span>
          </button>

          <nav className="travel-topbar__nav" aria-label="Primary">
            <button type="button" className="travel-topbar__link is-active" onClick={() => navigate("/dashboard")}>Dashboard</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/my-trips")}>My Trips</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/explore")}>Explore</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/bookings")}>Bookings</button>
            <button type="button" className="travel-topbar__link" onClick={() => navigate("/trip-packages")}>Packages</button>
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
            <div className="hero__topline">
              <div className="hero__eyebrow">Personal travel dashboard</div>
              <div className="hero__guest">Curated for {displayName}</div>
            </div>
            <h1>
              Discover Nepal with
              <span> confidence, calm planning,</span>
              and unforgettable journeys.
            </h1>
            <p>
              Everything you need for a premium travel planning experience lives here: inspiration, itinerary flow,
              weather awareness, budgets, and beautifully organized next steps.
            </p>
            <div className="hero__highlights">
              <span>Trusted routes</span>
              <span>Real booking visibility</span>
              <span>AI trip planning</span>
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
            <div className="glass-card hero__visual-caption">
              <div>
                <span>Next journey</span>
                <strong>{upcomingTrip?.title || itinerary?.destination || heroDestination?.name || "Pokhara"}</strong>
              </div>
              <small>
                {itineraryDays[0]?.title ||
                  heroDestination?.tag ||
                  "Mountain views, lakeside calm, and easy next steps for planning."}
              </small>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <main className="dashboard-grid__main">
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
                    <article key={destination.id} className="destination-card">
                      <div className="destination-card__image">
                        <img src={destination.image} alt={destination.name} />
                        <span className="destination-card__tag">{destination.category}</span>
                      </div>
                      <div className="destination-card__body">
                        <div>
                          <h3>{destination.name}</h3>
                          <p className="destination-card__location"><MapPin size={14} />{destination.tag}</p>
                          <p className="destination-card__copy">{destination.description}</p>
                        </div>
                        <button type="button" className="action-btn action-btn--ghost" onClick={() => goToDestinationHub(destination.locationId)}>Explore destination</button>
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
                    </article>
                  );
                })}
              </div>
            </section>
          </main>

          <aside className="dashboard-grid__sidebar">
            <section className="premium-card premium-card--compact weather-widget">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Weather Widget</p><h2>{weather.label}</h2></div>
                <Sun size={18} />
              </div>
              <div className="weather-widget__hero"><strong>{weather.temp}</strong><span>{weather.summary}</span></div>
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Spending Overview</p><h2>Spend with clarity</h2></div>
              </div>
              {budgetLoading ? (
                <p className="dashboard-note">Loading booking and payment totals...</p>
              ) : (
                <div className="budget-stack">
                  <div className="budget-stack__row"><span>Total booked</span><strong>NPR {totalBookedAmount.toLocaleString()}</strong></div>
                  <div className="budget-stack__row"><span>Total paid</span><strong>NPR {totalPaidAmount.toLocaleString()}</strong></div>
                  <div className="budget-stack__row"><span>Pending payment</span><strong>NPR {totalPendingAmount.toLocaleString()}</strong></div>
                  <div className="budget-stack__row"><span>Confirmed bookings</span><strong>{confirmedBookings}</strong></div>
                  <div className="budget-stack__bar"><span style={{ width: `${budgetBarPercent}%` }} /></div>
                  <small>{totalBookedAmount > 0 ? `${budgetBarPercent}% of your booked value is already paid.` : "Book a stay or package to start tracking confirmed spend."}</small>
                </div>
              )}
              {!budgetLoading && budgetError && <p className="dashboard-error">{budgetError}</p>}
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Saved Places</p><h2>Ready when you are</h2></div>
              </div>
              <div className="mini-list">
                {savedPlaces.map((place) => (
                  <button key={place.id} type="button" className="mini-list__item" onClick={() => goToDestinationHub(place.locationId)}>
                    <img src={place.image} alt={place.name} />
                    <div><strong>{place.name}</strong><small>{place.note}</small></div>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Travel Buddies</p><h2>Companions nearby</h2></div>
                <Users size={18} />
              </div>
              <div className="buddy-list">
                {travelBuddies.map((buddy) => (
                  <div key={buddy.id} className="buddy-list__item">
                    <span className="buddy-list__avatar">{initialsFromName(buddy.name)}</span>
                    <div><strong>{buddy.name}</strong><small>{buddy.plan}</small><p>{buddy.status}</p></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Trip History</p><h2>Recent journeys</h2></div>
                <Clock3 size={18} />
              </div>
              <div className="history-list">
                {tripHistory.length > 0 ? (
                  tripHistory.map((trip) => (
                    <div key={trip._id} className="history-list__item">
                      <div><strong>{trip.title}</strong><small>{formatDate(trip.startDate)}</small></div>
                      <span>{new Date(trip.endDate) < now ? "Completed" : "Upcoming"}</span>
                    </div>
                  ))
                ) : (
                  <p className="dashboard-note">Your completed and upcoming trips will appear here.</p>
                )}
              </div>
            </section>

            <section className="premium-card premium-card--compact">
              <div className="section-head section-head--tight">
                <div><p className="section-head__eyebrow">Notifications</p><h2>What needs attention</h2></div>
                <Bell size={18} />
              </div>
              <div className="notification-stack">
                {notificationsPreview.map((item) => (
                  <div key={item} className="notification-stack__item"><span /><p>{item}</p></div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
