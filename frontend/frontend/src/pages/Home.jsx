import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Coffee,
  Compass,
  Map,
  LoaderCircle,
  Mountain,
  UtensilsCrossed,
  Search,
  Star,
} from "lucide-react";
import api, { resolveImageUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";

const destinationKeywords = {
  lake: "Lakeside",
  trek: "Trekking",
  mountain: "Mountain views",
  heritage: "Heritage",
  safari: "Wildlife",
  temple: "Culture",
  hill: "Hill escape",
  adventure: "Adventure",
};

const currency = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

const destinationTag = (location) => {
  const haystack = `${location?.category || ""} ${location?.description || ""}`.toLowerCase();
  const hit = Object.entries(destinationKeywords).find(([keyword]) => haystack.includes(keyword));
  return hit?.[1] || location?.category || "Featured destination";
};

const locationImage = (location) => {
  const images = Array.isArray(location?.images) ? location.images : [];
  return resolveImageUrl(location?.image || images[0] || "");
};

const listingImage = (listing) => {
  const photos = Array.isArray(listing?.photos) ? listing.photos : [];
  return resolveImageUrl(photos[0] || "");
};

const getParentId = (location) => {
  if (!location?.parentLocationId) return "";
  if (typeof location.parentLocationId === "string") return location.parentLocationId;
  return location.parentLocationId?._id || "";
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [locations, setLocations] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [locationsRes, listingsRes] = await Promise.all([
          api.get("/api/locations"),
          api.get("/api/listings"),
        ]);

        if (!active) return;
        setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : []);
        setListings(Array.isArray(listingsRes.data?.listings) ? listingsRes.data.listings : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Unable to load homepage data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHomeData();
    return () => {
      active = false;
    };
  }, []);

  const hubLocations = useMemo(
    () => locations.filter((location) => !getParentId(location)),
    [locations]
  );

  const placeLocations = useMemo(
    () => locations.filter((location) => getParentId(location)),
    [locations]
  );

  const featuredLocations = useMemo(
    () => (placeLocations.length ? placeLocations.slice(0, 6) : hubLocations.slice(0, 6)),
    [hubLocations, placeLocations]
  );

  const hotelListings = useMemo(
    () => listings.filter((item) => String(item.type || "").toLowerCase() === "hotel").slice(0, 4),
    [listings]
  );

  const listingCategories = useMemo(
    () => [
      { key: "all", label: "All Places", icon: Map },
      { key: "hotel", label: "Hotels", icon: BedDouble },
      { key: "restaurant", label: "Restaurants", icon: UtensilsCrossed },
      { key: "cafe", label: "Cafes", icon: Coffee },
      { key: "activity", label: "Activities", icon: Mountain },
    ],
    []
  );

  const filteredCategoryListings = useMemo(() => {
    const base = activeCategory === "all"
      ? listings
      : listings.filter((item) => String(item.type || "").toLowerCase() === activeCategory);
    return base.slice(0, 6);
  }, [activeCategory, listings]);

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return { locations: [], listings: [] };

    const matchedLocations = locations.filter((location) =>
      [location.name, location.description, location.district, location.province, location.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ).slice(0, 4);

    const matchedListings = listings.filter((listing) =>
      [
        listing.title,
        listing.description,
        listing.type,
        listing.location?.name,
        listing.location?.district,
        listing.location?.province,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    ).slice(0, 6);

    return { locations: matchedLocations, listings: matchedListings };
  }, [locations, listings, query]);

  const heroLocation = hubLocations[0] || locations[0];
  const marqueeLocations = featuredLocations.length > 1 ? [...featuredLocations, ...featuredLocations] : featuredLocations;

  const stats = [
    { label: "Admin-posted locations", value: locations.length || "0" },
    { label: "Active stays & places", value: listings.length || "0" },
    { label: "Travel tools", value: "Planner + Buddy" },
  ];

  const featuredSearch = (event) => {
    event.preventDefault();
    const next = query.trim();
    if (!next) {
      navigate(user ? "/explore" : "/login");
      return;
    }
    const hasMatches = searchResults.locations.length > 0 || searchResults.listings.length > 0;
    if (hasMatches) {
      document.getElementById("home-search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate(user ? `/explore?search=${encodeURIComponent(next)}` : "/login");
  };

  return (
    <div className="home">
      <div className="home__atmosphere" />

      <nav className="home__nav">
        <div className="home__brand">
          <span className="home__brand-mark">ST</span>
          <div>
            <strong>Smart Travel Nepal</strong>
            <small>Real locations, stays, and local places</small>
          </div>
        </div>

        <div className="home__nav-actions">
          {user ? (
            <>
              <Link to="/dashboard" className="home__nav-link">Dashboard</Link>
              <Link to="/explore" className="home__nav-cta">Explore</Link>
            </>
          ) : (
            <>
              <Link to="/login" className="home__nav-link">Login</Link>
              <Link to="/signup" className="home__nav-cta">Create account</Link>
            </>
          )}
        </div>
      </nav>

      <main className="home__main">
        <section className="home__hero">
          <div className="home__hero-copy">
            <h1>Plan around real places in Nepal, not placeholder cards.</h1>

            <form className="home__search" onSubmit={featuredSearch}>
              <div className="home__search-field">
                <Search size={18} />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Kathmandu, Pokhara, Chitwan, hotels, cafes..."
                />
              </div>
              <button type="submit">Search</button>
            </form>

            <div className="home__hero-actions">
              <Link to={user ? "/explore" : "/signup"} className="home__primary-btn">
                Explore destinations
              </Link>
            </div>

            <div className="home__stats">
              {stats.map((item) => (
                <article key={item.label} className="home__stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="home__hero-panel">
            {heroLocation ? (
              <article className="home__hero-feature home__hero-feature--image">
                <img
                  src={locationImage(heroLocation) || "https://images.unsplash.com/photo-1501555088652-021faa106b9b?q=80&w=1400&auto=format&fit=crop"}
                  alt={heroLocation.name}
                  className="home__hero-feature-image"
                />
                <div className="home__hero-feature-overlay" />
                <div className="home__hero-feature-content">
                  <p className="home__hero-kicker">Featured Destination</p>
                  <h2>{heroLocation.name}</h2>
                  <div className="home__hero-meta">
                    <span>{heroLocation.district || "District"}</span>
                    <span>{heroLocation.province || "Province"}</span>
                    <span>{destinationTag(heroLocation)}</span>
                  </div>
                  <p>{heroLocation.description || "Fresh destination from your admin panel."}</p>
                  <Link to={user ? `/locations/${heroLocation._id}` : "/login"} className="home__inline-link">
                    View destination
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ) : (
              <article className="home__hero-feature">
                <p className="home__hero-kicker">Featured Destination</p>
                <h2>Waiting for admin locations</h2>
                <p>Add locations from the admin panel to populate the homepage.</p>
              </article>
            )}

          </div>
        </section>

        {query.trim() ? (
          <section className="home__section" id="home-search-results">
            <div className="home__section-head">
              <div>
                <p className="home__section-kicker">Search Results</p>
                <h2>Matches for “{query.trim()}”</h2>
              </div>
            </div>

            {searchResults.locations.length === 0 && searchResults.listings.length === 0 ? (
              <div className="home__empty">No homepage matches found. Try another keyword or open Explore.</div>
            ) : (
              <div className="home__search-results">
                {searchResults.locations.map((location) => (
                  <article key={`location-${location._id}`} className="home__search-card">
                    <div>
                      <span className="home__pill">Destination</span>
                      <h3>{location.name}</h3>
                      <p>{[location.district, location.province, location.category].filter(Boolean).join(", ")}</p>
                    </div>
                    <Link to={user ? `/locations/${location._id}` : "/login"} className="home__inline-link">
                      Open location
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}

                {searchResults.listings.map((listing) => (
                  <article key={`listing-${listing._id}`} className="home__search-card">
                    <div>
                      <span className="home__pill">{listing.type || "Place"}</span>
                      <h3>{listing.title}</h3>
                      <p>{[listing.location?.name, listing.location?.district].filter(Boolean).join(", ")}</p>
                    </div>
                    <Link to={user ? `/places/${listing._id}` : "/login"} className="home__inline-link">
                      View details
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="home__section">
          <div className="home__section-head">
            <div>
                <p className="home__section-kicker">Places</p>
                <h2>Explore places inside destinations</h2>
            </div>
            <Link to={user ? "/explore" : "/login"} className="home__section-link">See all</Link>
          </div>

          {loading ? (
            <div className="home__loading">
              <LoaderCircle size={20} className="home__spin" />
              <span>Loading locations...</span>
            </div>
          ) : error ? (
            <div className="home__empty">{error}</div>
          ) : featuredLocations.length ? (
            <div className="home__location-marquee">
              <div className={`home__location-track ${featuredLocations.length > 1 ? "home__location-track--animated" : ""}`}>
              {marqueeLocations.map((location, index) => (
                <article key={`${location._id}-${index}`} className="home__location-card">
                  <div className="home__location-media">
                    {locationImage(location) ? (
                      <img src={locationImage(location)} alt={location.name} />
                    ) : (
                      <div className="home__location-placeholder">{location.name}</div>
                    )}
                  </div>
                  <div className="home__location-body">
                    <div className="home__pill">{destinationTag(location)}</div>
                    <h3>{location.name}</h3>
                    <p>{location.description || "A location added from the admin dashboard."}</p>
                    <div className="home__location-meta">
                      <span>{location.district || "District"}</span>
                      <span>{location.province || "Province"}</span>
                    </div>
                  </div>
                </article>
              ))}
              </div>
            </div>
          ) : (
            <div className="home__empty">No public locations yet. Add some in the admin panel.</div>
          )}
        </section>

        <section className="home__section home__section--split">
          <div className="home__section-block">
            <div className="home__section-head">
              <div>
                <p className="home__section-kicker">Hotels</p>
                <h2>Stay options from your listing data</h2>
              </div>
            </div>

            {hotelListings.length ? (
              <div className="home__listing-grid">
                {hotelListings.map((listing) => (
                  <article key={listing._id} className="home__listing-card">
                    <div className="home__listing-image">
                      {listingImage(listing) ? (
                        <img src={listingImage(listing)} alt={listing.title} />
                      ) : (
                        <div className="home__listing-placeholder">Hotel</div>
                      )}
                    </div>
                    <div className="home__listing-body">
                      <div className="home__listing-top">
                        <h3>{listing.title}</h3>
                        <span>{currency(listing.pricePerUnit)}</span>
                      </div>
                      <p>{listing.location?.name || listing.location?.district || "Hotel listing"}</p>
                      <div className="home__listing-meta">
                        <span><Star size={14} /> {Number(listing.rating || 0).toFixed(1)}</span>
                        <span>{listing.capacity || 1} guests</span>
                      </div>
                      <div className="home__card-actions">
                        <Link to={user ? `/places/${listing._id}` : "/login"} className="home__card-link">
                          View stay
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="home__empty">No active hotel listings yet.</div>
            )}
          </div>

          <div className="home__section-block">
            <div className="home__section-head">
              <div>
                <p className="home__section-kicker">Places</p>
                <h2>Browse by category</h2>
              </div>
            </div>

            <div className="home__category-tabs">
              {listingCategories.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveCategory(key)}
                  className={`home__category-tab ${activeCategory === key ? "home__category-tab--active" : ""}`}
                >
                  <Icon size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {filteredCategoryListings.length ? (
              <div className="home__place-stack">
                {filteredCategoryListings.map((listing) => (
                  <article key={listing._id} className="home__place-card">
                    <div>
                      <p className="home__place-type">{listing.type || "Place"}</p>
                      <h3>{listing.title}</h3>
                      <p>{listing.location?.name || listing.location?.district || "Local listing"}</p>
                    </div>
                    <Link to={user ? `/places/${listing._id}` : "/login"} className="home__inline-link">
                      View details
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="home__empty">No listings found for this category yet.</div>
            )}
          </div>
        </section>

        <section className="home__section">
          <div className="home__cta-panel">
            <div>
              <p className="home__section-kicker">Next step</p>
              <h2>Plan, match, and book from one system</h2>
              <p>Move from discovery to buddy matching and trip planning without leaving the platform.</p>
            </div>
            <div className="home__cta-actions">
              <Link to={user ? "/itinerary-planner" : "/signup"} className="home__primary-btn">AI planner</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="home__footer">
        <div className="home__footer-brand">
          <strong>Smart Travel Nepal</strong>
          <span>Real places, stays, and travel tools</span>
        </div>
        <div className="home__footer-links">
          <Link to={user ? "/explore" : "/login"}>Explore</Link>
          <Link to={user ? "/community" : "/login"}>Community</Link>
          <Link to={user ? "/trip-packages" : "/login"}>Trip packages</Link>
        </div>
      </footer>

      <style>{`
        .home {
          --ink: #10213b;
          --muted: #5e718b;
          --line: rgba(148, 163, 184, 0.2);
          --card: rgba(255, 255, 255, 0.84);
          --card-strong: rgba(255, 255, 255, 0.96);
          --brand: #0f766e;
          --brand-deep: #0f4c81;
          --accent: #f97316;
          min-height: 100vh;
          color: var(--ink);
          background:
            radial-gradient(circle at top left, rgba(14, 165, 233, 0.16), transparent 28%),
            radial-gradient(circle at top right, rgba(249, 115, 22, 0.14), transparent 24%),
            linear-gradient(180deg, #edf6ff 0%, #f8fafc 30%, #fff7ed 100%);
          font-family: "Sora", "Plus Jakarta Sans", system-ui, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .home__atmosphere {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0.18)),
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.36), transparent 22%);
          pointer-events: none;
        }

        .home__nav,
        .home__main,
        .home__footer {
          position: relative;
          z-index: 1;
          max-width: 1260px;
          margin: 0 auto;
          padding-left: 18px;
          padding-right: 18px;
        }

        .home__nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 22px;
        }

        .home__brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .home__brand-mark {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          color: #fff;
          font-weight: 800;
          background: linear-gradient(135deg, var(--brand-deep), var(--brand), #14b8a6);
          box-shadow: 0 16px 34px rgba(15, 76, 129, 0.26);
        }

        .home__brand strong,
        .home__footer-brand strong {
          display: block;
          font-size: 1rem;
        }

        .home__brand small,
        .home__footer-brand span {
          color: var(--muted);
          font-size: 0.84rem;
        }

        .home__nav-actions,
        .home__hero-actions,
        .home__cta-actions,
        .home__footer-links {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .home__nav-link,
        .home__footer-links a {
          color: var(--ink);
          text-decoration: none;
          font-weight: 600;
        }

        .home__nav-cta,
        .home__primary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          border-radius: 999px;
          border: none;
          text-decoration: none;
          color: #fff;
          font-weight: 700;
          background: linear-gradient(135deg, var(--brand-deep), #0ea5e9);
          box-shadow: 0 18px 36px rgba(14, 116, 144, 0.2);
        }

        .home__secondary-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          color: var(--ink);
          background: rgba(255,255,255,0.84);
          border: 1px solid var(--line);
        }

        .home__main {
          padding-top: 22px;
          padding-bottom: 34px;
        }

        .home__hero {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 24px;
          align-items: stretch;
        }

        .home__hero-copy,
        .home__hero-panel,
        .home__cta-panel,
        .home__section-block {
          border: 1px solid rgba(255,255,255,0.72);
          background: var(--card);
          backdrop-filter: blur(14px);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
        }

        .home__hero-copy {
          padding: 34px;
          border-radius: 36px;
        }

        .home__eyebrow,
        .home__section-kicker,
        .home__hero-kicker,
        .home__place-type,
        .home__pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .home__eyebrow,
        .home__section-kicker,
        .home__hero-kicker {
          color: var(--brand);
        }

        .home__hero h1 {
          margin: 16px 0 0;
          font-size: clamp(2.8rem, 5vw, 5.3rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
          max-width: 11ch;
        }

        .home__hero-text,
        .home__cta-panel p,
        .home__location-body p,
        .home__listing-body p {
          color: var(--muted);
          line-height: 1.8;
        }

        .home__hero-text {
          margin: 18px 0 0;
          max-width: 48rem;
          font-size: 1.02rem;
        }

        .home__search {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          margin-top: 24px;
        }

        .home__search-field {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          border-radius: 999px;
          background: rgba(255,255,255,0.92);
          border: 1px solid var(--line);
          min-height: 58px;
        }

        .home__search-field input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.96rem;
          color: var(--ink);
        }

        .home__search button {
          min-width: 126px;
          border: none;
          border-radius: 999px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #f97316, #ea580c);
          cursor: pointer;
        }

        .home__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }

        .home__stat {
          padding: 16px;
          border-radius: 22px;
          background: rgba(255,255,255,0.76);
          border: 1px solid var(--line);
        }

        .home__stat strong {
          display: block;
          font-size: 1.35rem;
        }

        .home__stat span {
          display: block;
          margin-top: 6px;
          color: var(--muted);
          font-size: 0.85rem;
        }

        .home__hero-panel {
          padding: 12px;
          border-radius: 36px;
          display: grid;
          background:
            linear-gradient(180deg, rgba(15,76,129,0.94), rgba(14,165,233,0.88) 50%, rgba(20,184,166,0.9)),
            rgba(15, 23, 42, 0.8);
          color: #fff;
        }

        .home__hero-feature {
          position: relative;
          min-height: 100%;
          border-radius: 26px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.1);
          padding: 22px;
          overflow: hidden;
        }

        .home__hero-feature h2 {
          margin: 10px 0 0;
          font-size: clamp(2rem, 3vw, 3rem);
          line-height: 0.95;
          max-width: 10ch;
        }

        .home__hero-feature p {
          color: rgba(255,255,255,0.86);
        }

        .home__hero-feature--image {
          display: flex;
          align-items: flex-end;
          min-height: 100%;
          padding: 0;
          background: #0f172a;
        }

        .home__hero-feature-image,
        .home__hero-feature-overlay {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .home__hero-feature-image {
          object-fit: cover;
        }

        .home__hero-feature-overlay {
          background:
            linear-gradient(180deg, rgba(8,47,73,0.08), rgba(8,47,73,0.36) 38%, rgba(15,23,42,0.92) 100%),
            linear-gradient(135deg, rgba(14,165,233,0.12), rgba(20,184,166,0.12));
        }

        .home__hero-feature-content {
          position: relative;
          z-index: 1;
          width: 100%;
          padding: 26px;
        }

        .home__hero-feature-content p:last-of-type {
          max-width: 28rem;
        }

        .home__hero-meta,
        .home__location-meta,
        .home__listing-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .home__hero-meta span,
        .home__location-meta span,
        .home__listing-meta span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          font-size: 0.82rem;
        }

        .home__inline-link,
        .home__card-link,
        .home__section-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: inherit;
          text-decoration: none;
        }

        .home__inline-link,
        .home__card-link {
          margin-top: 16px;
        }

        .home__cta-panel {
          margin-top: 26px;
          border-radius: 34px;
          padding: 22px;
        }

        .home__location-placeholder,
        .home__listing-placeholder,
        .home__empty,
        .home__loading {
          display: grid;
          place-items: center;
          text-align: center;
          color: var(--muted);
        }

        .home__location-placeholder,
        .home__listing-placeholder {
          height: 100%;
          min-height: 220px;
          background: linear-gradient(135deg, #e0f2fe, #ecfeff);
          padding: 20px;
        }

        .home__section {
          margin-top: 28px;
        }

        .home__section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .home__section-head h2,
        .home__cta-panel h2 {
          margin: 10px 0 0;
          font-size: clamp(2rem, 4vw, 3.2rem);
          line-height: 1;
          letter-spacing: -0.05em;
        }

        .home__listing-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .home__location-marquee {
          overflow: hidden;
          mask-image: linear-gradient(90deg, transparent 0, rgba(0,0,0,1) 6%, rgba(0,0,0,1) 94%, transparent 100%);
        }

        .home__location-track {
          display: flex;
          gap: 18px;
          width: max-content;
        }

        .home__location-track--animated {
          animation: home-marquee 32s linear infinite;
        }

        .home__location-marquee:hover .home__location-track--animated {
          animation-play-state: paused;
        }

        .home__location-card,
        .home__listing-card,
        .home__place-card {
          border-radius: 28px;
          overflow: hidden;
          background: var(--card-strong);
          border: 1px solid var(--line);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
        }

        .home__location-card {
          width: min(320px, calc(100vw - 56px));
          flex: 0 0 min(320px, calc(100vw - 56px));
        }

        .home__location-media,
        .home__listing-image {
          height: 170px;
          overflow: hidden;
          background: linear-gradient(135deg, #e2e8f0, #dbeafe);
        }

        .home__location-media img,
        .home__listing-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .home__location-body,
        .home__listing-body {
          padding: 18px;
        }

        .home__pill,
        .home__place-type {
          color: #0f766e;
        }

        .home__location-body h3,
        .home__listing-body h3,
        .home__place-card h3 {
          margin: 10px 0 0;
          font-size: 1.18rem;
        }

        .home__section--split {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 20px;
          align-items: start;
        }

        .home__search-results {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .home__search-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
          border-radius: 24px;
          background: var(--card-strong);
          border: 1px solid var(--line);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
        }

        .home__section-block {
          padding: 22px;
          border-radius: 32px;
        }

        .home__listing-top {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 12px;
        }

        .home__listing-top span {
          font-weight: 700;
          color: var(--brand-deep);
        }

        .home__place-stack {
          display: grid;
          gap: 14px;
        }

        .home__category-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .home__category-tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: rgba(255,255,255,0.84);
          color: var(--ink);
          cursor: pointer;
          font-weight: 700;
        }

        .home__category-tab--active {
          background: linear-gradient(135deg, #0f766e, #0ea5e9);
          color: #fff;
          border-color: transparent;
        }

        .home__place-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 18px;
        }

        .home__card-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
        }

        .home__cta-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          background:
            linear-gradient(135deg, rgba(8,47,73,0.94), rgba(14,116,144,0.92) 55%, rgba(20,184,166,0.88)),
            #0f172a;
          color: #fff;
        }

        .home__cta-panel .home__section-kicker,
        .home__cta-panel h2,
        .home__cta-panel p {
          color: #fff;
        }

        .home__empty,
        .home__loading {
          min-height: 170px;
          padding: 24px;
          border-radius: 28px;
          border: 1px dashed rgba(148, 163, 184, 0.4);
          background: rgba(255,255,255,0.6);
        }

        .home__spin {
          animation: home-spin 1s linear infinite;
        }

        .home__footer {
          margin-top: 10px;
          padding-top: 18px;
          padding-bottom: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-top: 1px solid rgba(148, 163, 184, 0.18);
        }

        @keyframes home-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes home-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-50% - 9px));
          }
        }

        @media (max-width: 1100px) {
          .home__hero,
          .home__section--split,
          .home__cta-panel {
            grid-template-columns: 1fr;
            display: grid;
          }

          .home__location-grid,
          .home__listing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .home__nav,
          .home__footer,
          .home__section-head {
            flex-direction: column;
            align-items: stretch;
          }

          .home__hero-copy,
          .home__hero-panel,
          .home__section-block,
          .home__cta-panel {
            padding: 18px;
            border-radius: 24px;
          }

          .home__hero-panel {
            padding: 10px;
          }

          .home__hero-feature-content {
            padding: 18px;
          }

          .home__search {
            grid-template-columns: 1fr;
          }

          .home__stats,
          .home__listing-grid,
          .home__search-results {
            grid-template-columns: 1fr;
          }

          .home__place-card {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
