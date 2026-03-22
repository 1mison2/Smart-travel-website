import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, Mountain, Sparkles, Compass, Clock, Search, Bell, User, LogOut, Settings, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

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
  const searchDebounceRef = useRef(null);
  const searchBlurRef = useRef(null);
  const unreadCountRef = useRef(0);
  const pulseTimerRef = useRef(null);
  const displayName = user?.name || user?.fullName || "Traveler";

  const [itinerary, setItinerary] = useState(null);
  const [itineraryLoading, setItineraryLoading] = useState(true);
  const [itineraryError, setItineraryError] = useState("");
  const [liveDestinations, setLiveDestinations] = useState(() => readCachedDestinations());
  const [destinationsLoading, setDestinationsLoading] = useState(true);
  const [destinationsError, setDestinationsError] = useState("");
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState("");

  const loadDestinations = useCallback(async () => {
    try {
      setDestinationsLoading(true);
      setDestinationsError("");
      const { data } = await api.get("/api/locations");

      const mapped = (Array.isArray(data) ? data : []).map((location, index) => ({
        id: location._id || `${location.name}-${index}`,
        locationId: location._id || "",
        name: location.name || "Destination",
        tag:
          [location.district, location.province, location.category].filter(Boolean).join(" - ") ||
          "Travel Spot",
        image:
          location.image ||
          "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
      }));

      setLiveDestinations(mapped);
      sessionStorage.setItem(DESTINATIONS_CACHE_KEY, JSON.stringify(mapped));
    } catch (err) {
      setDestinationsError(err?.response?.data?.message || "Unable to refresh destinations right now.");
    } finally {
      setDestinationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

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

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

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

  useEffect(() => {
    loadItinerary();
  }, [loadItinerary]);

  useEffect(() => {
    if (!user?._id) return undefined;

    let active = true;

    const fetchUnreadCount = async () => {
      try {
        const { data } = await api.get("/api/notifications/me?limit=1");
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
        // ignore notification polling errors
      }
    };

    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, NOTIFICATION_POLL_MS);

    return () => {
      active = false;
      clearInterval(intervalId);
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
        pulseTimerRef.current = null;
      }
    };
  }, [user?._id]);

  const popularDestinations = liveDestinations;
  const now = new Date();
  const sortedTrips = [...trips].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const upcomingTrip = sortedTrips.find((trip) => new Date(trip.startDate) >= now) || sortedTrips[0] || null;
  const daysUntilNextTrip = upcomingTrip ? daysBetween(now, new Date(upcomingTrip.startDate)) : null;
  const tripHistory = [...trips]
    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
    .slice(0, 6);

  const travelBuddies = [
    { id: 1, name: "Aarav", destination: "Everest Region", dates: "Apr 10 - Apr 18" },
    { id: 2, name: "Maya", destination: "Mustang", dates: "May 02 - May 08" },
    { id: 3, name: "Rinzin", destination: "Pokhara", dates: "Mar 14 - Mar 18" },
  ];

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const getTripImage = (trip) => {
    if (!trip) return "";
    const tripTitle = normalizeText(trip.title);
    if (!tripTitle) return "";
    const match = liveDestinations.find((destination) => {
      const name = normalizeText(destination.name);
      return name && (tripTitle.includes(name) || name.includes(tripTitle));
    });
    return match?.image || "";
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const goToDestinationHub = (locationId) => {
    if (locationId) {
      navigate(`/locations/${locationId}`);
      return;
    }
    navigate("/destination-search");
  };

  const onDashboardSearch = (event) => {
    event.preventDefault();
    const term = searchTerm.trim();
    if (!term) return;
    // Keep user on dashboard; dropdown handles navigation.
    if (searchResults.length === 1) {
      goToDestinationHub(searchResults[0]?.id);
    }
  };

  const handleSearchFocus = () => {
    if (searchBlurRef.current) {
      clearTimeout(searchBlurRef.current);
      searchBlurRef.current = null;
    }
    setSearchFocused(true);
  };

  const handleSearchBlur = () => {
    searchBlurRef.current = setTimeout(() => {
      setSearchFocused(false);
    }, 120);
  };

  useEffect(() => {
    const term = searchTerm.trim();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!term) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError("");
        const { data } = await api.get(`/api/places/search?query=${encodeURIComponent(term)}`);
        const results = Array.isArray(data?.results) ? data.results : [];
        setSearchResults(results.slice(0, 6));
      } catch (err) {
        setSearchError(err?.response?.data?.message || "Search failed. Try again.");
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchTerm]);

  return (
    <div className="dashboard">
      <div className="dashboard__bg" />

      <div className="dashboard__container">
        <div className="dashboard__topbar">
          <div className="topbar__brand">
            <Mountain size={22} />
            <span>Smart Travel Nepal</span>
          </div>

          <nav className="topbar__menu" aria-label="Primary">
            <button type="button" className="topbar__link" onClick={() => navigate("/dashboard")}>Dashboard</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/my-trips")}>My Trips</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/trip-packages")}>Trip Packages</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/explore")}>Explore</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/bookings")}>Bookings</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/destination-search")}>Find Stays</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/itinerary-planner")}>Itinerary</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/map-explorer")}>Map Explorer</button>
            <button type="button" className="topbar__link" onClick={() => navigate("/buddy-finder")}>Buddy Chat</button>
          </nav>

          <form className="topbar__search" onSubmit={onDashboardSearch}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search destinations in Nepal"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
            {searchFocused && (searchLoading || searchError || searchResults.length > 0) && (
              <div className="topbar__search-results">
                {searchLoading && <div className="topbar__search-row">Searching...</div>}
                {!searchLoading && searchError && <div className="topbar__search-row">{searchError}</div>}
                {!searchLoading && !searchError && searchResults.length === 0 && (
                  <div className="topbar__search-row">No destinations found.</div>
                )}
                {!searchLoading && !searchError && searchResults.length > 0 && (
                  <ul className="topbar__search-list" role="listbox">
                    {searchResults.map((result) => (
                      <li key={result.id} className="topbar__search-item" role="option">
                        <button
                          type="button"
                          className="topbar__search-btn"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goToDestinationHub(result.id)}
                        >
                          <span className="topbar__search-title">{result.name}</span>
                          <span className="topbar__search-meta">
                            {[result.district, result.province, result.category].filter(Boolean).join(" - ")}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </form>

          <div className="topbar__actions">
            <button
              type="button"
              className={`icon-btn ${notifPulse ? "icon-btn--pulse" : ""}`}
              aria-label="Notifications"
              onClick={() => {
                setNotifPulse(false);
                navigate("/notifications");
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notif-badge" aria-label={`${unreadCount} unread notifications`}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <div className="profile">
              <button
                type="button"
                className="icon-btn"
                aria-label="Profile"
                onClick={() => setShowProfileMenu((prev) => !prev)}
              >
                <User size={18} />
              </button>
              {showProfileMenu && (
                <div className="profile__menu">
                  <div className="profile__header">
                    <div className="profile__avatar" aria-hidden>
                      <UserCircle size={28} />
                    </div>
                    <div>
                      <p className="profile__name">{displayName}</p>
                      <p className="profile__email">{user?.email || "traveler@smarttravel.com"}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="profile__item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/profile");
                    }}
                  >
                    <User size={16} />
                    View Profile
                  </button>
                  <button
                    type="button"
                    className="profile__item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate("/settings");
                    }}
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <div className="profile__meta">
                    <p>Membership: Explorer</p>
                    <p>Next trip: Pokhara</p>
                  </div>
                  <button type="button" className="profile__item profile__logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <header className="dashboard__header">
          <div>
            <p className="dashboard__kicker">Smart Travel Nepal</p>
            <h1 className="dashboard__title">
              Namaste, {displayName} <span aria-hidden>👋</span>
            </h1>
            <p className="dashboard__subtitle">Ready for your next journey in Nepal?</p>
          </div>

          <div className="dashboard__badges">
            <div className="dashboard__badge">
              <Clock size={16} />
              <span>Next Trip In</span>
              <strong>{daysUntilNextTrip === null ? "-" : `${daysUntilNextTrip} days`}</strong>
            </div>
            <div className="dashboard__badge">
              <Compass size={16} />
              <span>Trips Planned</span>
              <strong>{trips.length}</strong>
            </div>
          </div>
        </header>

        <div className="dashboard__grid">
          <main className="dashboard__main">
            <section className="card card--featured">
              <div className="card__header">
                <div className="card__title">
                  <Mountain size={20} />
                  <h2>Upcoming Trip</h2>
                </div>
                <span className="card__pill">Primary Focus</span>
              </div>

              {tripsLoading ? (
                <p className="dashboard__hint">Loading your latest trip...</p>
              ) : upcomingTrip ? (
                <div className="trip">
                  <div className="trip__image">
                    <img
                      src={getTripImage(upcomingTrip) || "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80"}
                      alt={upcomingTrip.title}
                    />
                  </div>
                  <div className="trip__info">
                    <h3>{upcomingTrip.title}</h3>
                    <p>
                      <Calendar size={16} /> {formatDate(upcomingTrip.startDate)} - {formatDate(upcomingTrip.endDate)}
                    </p>
                    <p>
                      <Users size={16} /> Budget: ${upcomingTrip.price || 0}
                    </p>
                    {upcomingTrip.summary && <p className="trip__summary">{upcomingTrip.summary}</p>}
                    <div className="trip__actions">
                      <Link
                        className="btn btn--primary"
                        to={itinerary?._id ? `/itineraries/${itinerary._id}` : "/itinerary-planner"}
                      >
                        View Itinerary
                      </Link>
                      <button className="btn btn--ghost" onClick={() => goToDestinationHub()}>Explore & Plan</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty">
                  No upcoming trips — start planning your Nepal adventure <span aria-hidden>🇳🇵</span>
                </div>
              )}
              {!tripsLoading && tripsError && <p className="dashboard__error">{tripsError}</p>}
            </section>

            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Sparkles size={20} />
                  <h2>Current Itinerary</h2>
                </div>
                <span className="card__pill card__pill--soft">AI Crafted</span>
              </div>

              {itineraryLoading && <p className="dashboard__hint">Loading your latest itinerary...</p>}
              {!itineraryLoading && itineraryError && <p className="dashboard__error">{itineraryError}</p>}
              {!itineraryLoading && !itineraryError && itinerary && (
                <div className="itinerary">
                  {(itinerary.days || []).map((day) => (
                    <div key={day.day} className="itinerary__day">
                      <div className="itinerary__badge">Day {day.day}</div>
                      <div>
                        <p className="itinerary__title">{day.title}</p>
                        <p className="itinerary__meta">
                          <MapPin size={14} /> {itinerary.destination}
                        </p>
                        <p className="itinerary__summary">
                          {(day.places || []).map((place) => place.name).filter(Boolean).join(", ") || "No places yet."}
                        </p>
                        {(day.places || []).some((place) => place.image) && (
                          <div className="itinerary__media">
                            {(day.places || [])
                              .filter((place) => place.image)
                              .slice(0, 3)
                              .map((place, index) => (
                                <div key={`${place.name}-${index}`} className="itinerary__thumb">
                                  <img src={place.image} alt={place.name} />
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!itineraryLoading && !itineraryError && !itinerary && (
                <div className="empty">
                  No itinerary generated yet. Start from the planner to create one.
                  <div className="card__actions">
                    <button className="btn btn--primary" onClick={() => navigate("/itinerary-planner")}>
                      Create Itinerary
                    </button>
                  </div>
                </div>
              )}

              <div className="card__actions">
                <button className="btn btn--primary" onClick={() => navigate("/my-trips")}>View Full Itinerary</button>
                <button className="btn btn--ghost">Regenerate with AI</button>
              </div>
            </section>

            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Compass size={20} />
                  <h2>Popular & Community Destinations</h2>
                </div>
                <button type="button" className="card__pill card__pill--soft card__pill--button" onClick={() => navigate("/explore")}>
                  Explore
                </button>
              </div>
              {destinationsLoading && <p className="dashboard__hint">Loading latest destinations...</p>}
              {!destinationsLoading && destinationsError && (
                <p className="dashboard__error">{destinationsError}</p>
              )}

              <div className="destinations">
                {popularDestinations.map((destination) => (
                  <article key={destination.id} className="destination">
                    <div className="destination__image">
                      <img src={destination.image} alt={destination.name} />
                    </div>
                    <div className="destination__content">
                      <div>
                        <h3>{destination.name}</h3>
                        <p>{destination.tag}</p>
                      </div>
                      <button className="btn btn--ghost" onClick={() => goToDestinationHub(destination.locationId)}>
                        Open Destination
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!destinationsLoading && liveDestinations.length === 0 && (
                <div className="empty">
                  No live destinations found. Please try again.
                  <div className="card__actions">
                    <button className="btn btn--ghost" onClick={loadDestinations}>Retry</button>
                  </div>
                </div>
              )}
            </section>
          </main>

          <aside className="dashboard__sidebar">
            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Calendar size={20} />
                  <h2>Trip History</h2>
                </div>
              </div>
              <div className="history">
                {tripHistory.map((trip) => (
                  <div key={trip._id} className="history__item">
                    <div>
                      <p className="history__name">{trip.title}</p>
                      <p className="history__date">{formatDate(trip.startDate)}</p>
                    </div>
                    <span className="history__tag">{new Date(trip.endDate) < now ? "Completed" : "Upcoming"}</span>
                  </div>
                ))}
                {!tripsLoading && tripHistory.length === 0 && (
                  <div className="empty">No saved trips yet.</div>
                )}
              </div>
              <button className="btn btn--ghost btn--full" onClick={() => navigate("/my-trips")}>View Full History</button>
            </section>

            <section className="card">
              <div className="card__header">
                <div className="card__title">
                  <Users size={20} />
                  <h2>Travel Buddies</h2>
                </div>
              </div>

              <div className="buddies">
                {travelBuddies.map((buddy) => (
                  <div key={buddy.id} className="buddy">
                    <div className="buddy__avatar" aria-hidden />
                    <div>
                      <p className="buddy__name">{buddy.name}</p>
                      <p className="buddy__meta">
                        {buddy.destination} - {buddy.dates}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="btn btn--primary btn--full">Find Buddies</button>
              <p className="trust">Verified Travelers Only</p>
            </section>
          </aside>
        </div>
      </div>

      <style>{`
        :root {
          --primary: #2f6b4f;
          --primary-dark: #24543e;
          --sky: #dce9e2;
          --sky-deep: #2f6b4f;
          --forest: #2f6b4f;
          --snow: #f6f4ee;
          --ink: #24313d;
          --muted: #667085;
          --card: #fffefb;
          --border: #e3e7eb;
          --shadow: 0 3px 12px rgba(15, 23, 42, 0.06);
        }

        .dashboard {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: var(--ink);
          position: relative;
          overflow: hidden;
        }

        .dashboard__bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 20% 10%, rgba(47, 107, 79, 0.1), transparent 44%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.45));
          pointer-events: none;
        }

        .dashboard__container {
          position: relative;
          max-width: 1280px;
          margin: 0 auto;
          padding: 20px 12px 32px;
        }

        .dashboard__topbar {
          position: sticky;
          top: 12px;
          z-index: 5;
          display: grid;
          grid-template-columns: auto 1fr minmax(220px, 320px) auto;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          margin-bottom: 14px;
          backdrop-filter: blur(4px);
        }

        .topbar__brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          color: var(--forest);
          white-space: nowrap;
        }

        .topbar__menu {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
          white-space: nowrap;
          overflow-x: auto;
          scrollbar-width: none;
          width: 100%;
          justify-content: space-between;
        }

        .topbar__menu::-webkit-scrollbar {
          display: none;
        }

        .topbar__link {
          background: transparent;
          border: none;
          color: var(--ink);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 10px;
          transition: background 0.2s ease, color 0.2s ease;
          white-space: nowrap;
        }

        .topbar__link:hover {
          background: rgba(47, 107, 79, 0.12);
          color: var(--primary);
        }

        .topbar__search {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--snow);
          border-radius: 12px;
          border: 1px solid var(--border);
          position: relative;
        }

        .topbar__search input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 0.9rem;
          color: var(--ink);
        }

        .topbar__search-results {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          padding: 6px;
          z-index: 30;
        }

        .topbar__search-row {
          padding: 10px 12px;
          font-size: 0.85rem;
          color: var(--muted);
        }

        .topbar__search-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 4px;
        }

        .topbar__search-item {
          margin: 0;
        }

        .topbar__search-btn {
          width: 100%;
          border: none;
          background: var(--snow);
          border-radius: 10px;
          padding: 10px 12px;
          display: grid;
          gap: 4px;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .topbar__search-btn:hover {
          background: rgba(47, 107, 79, 0.12);
          transform: translateY(-1px);
        }

        .topbar__search-title {
          font-weight: 600;
          color: var(--ink);
          font-size: 0.9rem;
        }

        .topbar__search-meta {
          font-size: 0.78rem;
          color: var(--muted);
        }

        .topbar__actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .profile {
          position: relative;
        }

        .profile__menu {
          position: absolute;
          right: 0;
          top: 48px;
          width: 240px;
          background: white;
          border-radius: 14px;
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
          padding: 14px;
          display: grid;
          gap: 10px;
          z-index: 20;
        }

        .profile__header {
          display: flex;
          gap: 10px;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border);
        }

        .profile__avatar {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: var(--snow);
          color: var(--forest);
        }

        .profile__name {
          margin: 0;
          font-weight: 600;
        }

        .profile__email {
          margin: 2px 0 0;
          font-size: 0.78rem;
          color: var(--muted);
        }

        .profile__item {
          background: var(--snow);
          border: none;
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          color: var(--ink);
          transition: background 0.2s ease, transform 0.2s ease;
        }

        .profile__item:hover {
          background: rgba(47, 107, 79, 0.1);
          transform: translateY(-1px);
        }

        .profile__meta {
          font-size: 0.8rem;
          color: var(--muted);
          display: grid;
          gap: 4px;
          padding: 4px 2px;
        }

        .profile__logout {
          background: rgba(239, 68, 68, 0.1);
          color: #b91c1c;
        }

        .icon-btn {
          border: none;
          background: var(--snow);
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          cursor: pointer;
          color: var(--ink);
          transition: transform 0.2s ease, background 0.2s ease;
          position: relative;
        }

        .icon-btn:hover {
          transform: translateY(-2px);
          background: rgba(47, 107, 79, 0.12);
        }

        .icon-btn--pulse {
          box-shadow: 0 0 0 0 rgba(47, 107, 79, 0.35);
          animation: notifPulse 1.8s ease-out 1;
        }

        .notif-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 20px;
          height: 20px;
          padding: 0 6px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ef4444, #f97316);
          color: white;
          font-size: 0.68rem;
          font-weight: 700;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          box-shadow: 0 6px 12px rgba(239, 68, 68, 0.25);
        }

        @keyframes notifPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(47, 107, 79, 0.35);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(47, 107, 79, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(47, 107, 79, 0);
          }
        }

        .dashboard__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 14px;
        }

        .dashboard__kicker {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.72rem;
          color: var(--forest);
          font-weight: 600;
          margin-bottom: 6px;
        }

        .dashboard__title {
          font-size: clamp(2rem, 3vw, 2.75rem);
          margin: 0 0 6px;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .dashboard__subtitle {
          color: var(--muted);
          margin: 0;
          font-size: 1rem;
        }

        .dashboard__badges {
          display: grid;
          gap: 12px;
          min-width: 220px;
        }

        .dashboard__badge {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 16px;
          padding: 12px 14px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 10px;
          align-items: center;
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
        }

        .dashboard__badge span {
          font-size: 0.85rem;
          color: var(--muted);
        }

        .dashboard__badge strong {
          font-size: 0.95rem;
          color: var(--ink);
        }

        .dashboard__grid {
          display: grid;
          grid-template-columns: 2.3fr 1fr;
          gap: 12px;
        }

        .dashboard__main {
          display: grid;
          gap: 12px;
        }

        .dashboard__sidebar {
          display: grid;
          gap: 12px;
        }

        .card {
          background: var(--card);
          border-radius: 16px;
          padding: 16px;
          box-shadow: var(--shadow);
          border: 1px solid var(--border);
        }

        .card--featured {
          border: 1px solid #cfe3d9;
          box-shadow: 0 4px 14px rgba(47, 107, 79, 0.12);
        }

        .card__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .card__title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.1rem;
        }

        .card__title h2 {
          margin: 0;
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .card__pill {
          background: rgba(47, 107, 79, 0.12);
          color: var(--forest);
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 10px;
          font-weight: 600;
        }

        .card__pill--soft {
          background: rgba(47, 107, 79, 0.12);
          color: var(--primary);
        }

        .card__pill--button {
          border: none;
          cursor: pointer;
        }

        .trip {
          display: grid;
          grid-template-columns: 1.2fr 1.4fr;
          gap: 18px;
          align-items: center;
        }

        .trip__image {
          border-radius: 14px;
          overflow: hidden;
          height: 150px;
        }

        .trip__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }

        .trip__image:hover img {
          transform: scale(1.05);
        }

        .trip__info h3 {
          margin: 0 0 10px;
          font-size: 1.4rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }

        .trip__info p {
          margin: 0 0 8px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.95rem;
        }

        .trip__summary {
          margin: 0 0 8px;
          color: #475569;
          line-height: 1.5;
        }

        .trip__actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
          flex-wrap: wrap;
        }

        .itinerary {
          display: grid;
          gap: 12px;
        }

        .itinerary__day {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 12px;
          padding: 12px;
          border-radius: 14px;
          background: var(--snow);
          border: 1px solid var(--border);
        }

        .itinerary__badge {
          background: rgba(47, 107, 79, 0.14);
          color: var(--primary);
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 0.8rem;
          height: fit-content;
        }

        .itinerary__title {
          font-weight: 600;
          margin: 0 0 4px;
        }

        .itinerary__meta {
          margin: 0;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
        }

        .itinerary__summary {
          margin: 6px 0 0;
          color: #475569;
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .itinerary__media {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .itinerary__thumb {
          width: 54px;
          height: 42px;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--snow);
        }

        .itinerary__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .card__actions {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .destinations {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .destination {
          background: var(--snow);
          border-radius: 14px;
          overflow: hidden;
          display: grid;
          grid-template-rows: 120px 1fr;
          border: 1px solid var(--border);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .destination:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 18px rgba(15, 23, 42, 0.1);
        }

        .destination__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .destination__content {
          padding: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .destination__content h3 {
          margin: 0;
          font-size: 1rem;
        }

        .destination__content p {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .dashboard__hint {
          margin: 0 0 10px;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .dashboard__error {
          margin: 0 0 10px;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.85rem;
        }

        .history {
          display: grid;
          gap: 8px;
        }

        .history__item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--snow);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .history__name {
          margin: 0;
          font-weight: 600;
        }

        .history__date {
          margin: 4px 0 0;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .history__tag {
          background: rgba(47, 107, 79, 0.15);
          color: var(--forest);
          font-size: 0.75rem;
          padding: 6px 10px;
          border-radius: 10px;
          font-weight: 600;
        }

        .buddies {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
        }

        .buddy {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--snow);
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid var(--border);
        }

        .buddy__avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #cbd5e1;
        }

        .buddy__name {
          margin: 0;
          font-weight: 600;
        }

        .buddy__meta {
          margin: 2px 0 0;
          font-size: 0.8rem;
          color: var(--muted);
        }

        .btn {
          border: none;
          border-radius: 11px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.9rem;
          transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
        }

        .btn--primary {
          background: var(--primary);
          color: white;
          box-shadow: none;
        }

        .btn--primary:hover {
          transform: translateY(-1px);
          background: var(--primary-dark);
        }

        .btn--ghost {
          background: white;
          color: var(--primary);
          border: 1px solid #cfe3d9;
        }

        .btn--ghost:hover {
          background: #edf6f1;
        }

        .btn--full {
          width: 100%;
          margin-top: 8px;
        }

        .trust {
          margin: 10px 0 0;
          color: var(--muted);
          font-size: 0.8rem;
          text-align: center;
        }

        .empty {
          padding: 18px;
          border-radius: 12px;
          background: var(--snow);
          color: var(--muted);
          font-weight: 500;
          border: 1px solid var(--border);
        }

        @media (max-width: 1024px) {
          .dashboard__topbar {
            grid-template-columns: 1fr;
            border-radius: 24px;
          }

          .topbar__menu {
            order: 3;
          }

          .topbar__search {
            order: 2;
            width: 100%;
          }

          .dashboard__grid {
            grid-template-columns: 1fr;
          }

          .dashboard__header {
            flex-direction: column;
          }

          .destinations {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .trip {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .destinations {
            grid-template-columns: 1fr;
          }

          .dashboard__badges {
            width: 100%;
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const ms = endDate.setHours(0, 0, 0, 0) - startDate.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
