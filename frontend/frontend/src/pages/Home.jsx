import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  Compass,
  LoaderCircle,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import api, { resolveImageUrl } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { setAuthRedirect } from "../utils/authRedirect";

const quickSearches = ["Mustang", "Pokhara", "Chitwan", "Kathmandu"];

const workspaceTools = [
  {
    title: "Explore map layers",
    copy: "Scan destinations spatially before opening the details.",
    to: "/explore",
    icon: Compass,
  },
  {
    title: "Shape itineraries",
    copy: "Build a polished trip flow from saved places and stays.",
    to: "/itinerary-planner",
    icon: Sparkles,
  },
  {
    title: "Coordinate buddies",
    copy: "Match travelers without leaving the planning workspace.",
    to: "/buddy-finder",
    icon: Users,
  },
];

const getParentId = (location) => {
  if (!location?.parentLocationId) return "";
  if (typeof location.parentLocationId === "string") return location.parentLocationId;
  return location.parentLocationId?._id || "";
};

const locationImage = (location) => {
  const images = Array.isArray(location?.images) ? location.images : [];
  return resolveImageUrl(location?.image || images[0] || "");
};

const listingImage = (listing) => {
  const photos = Array.isArray(listing?.photos) ? listing.photos : [];
  return resolveImageUrl(photos[0] || "");
};

const formatPriceBadge = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "Price on Request";
  return `NPR ${amount.toLocaleString()}`;
};

const locationHaystack = (location) =>
  `${location?.name || ""} ${location?.district || ""} ${location?.province || ""} ${location?.category || ""} ${
    location?.description || ""
  }`.toLowerCase();

export default function Home() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let active = true;

    const loadHomeData = async () => {
      try {
        setLoading(true);
        const [locationsRes, listingsRes] = await Promise.all([api.get("/api/locations"), api.get("/api/listings")]);
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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const rootLocations = useMemo(() => locations.filter((location) => !getParentId(location)), [locations]);
  const detailLocations = useMemo(() => locations.filter((location) => getParentId(location)), [locations]);
  const locationPool = detailLocations.length ? detailLocations : rootLocations;

  const heroLocation = useMemo(() => {
    const mustang = locationPool.find((location) => locationHaystack(location).includes("mustang"));
    return mustang || locationPool[0] || rootLocations[0] || locations[0] || null;
  }, [locationPool, rootLocations, locations]);

  const featuredLocations = useMemo(() => {
    const ordered = heroLocation
      ? [heroLocation, ...locationPool.filter((location) => location._id !== heroLocation._id)]
      : locationPool;
    return ordered.slice(0, 3);
  }, [heroLocation, locationPool]);

  const featuredStays = useMemo(
    () => listings.filter((item) => String(item.type || "").toLowerCase() === "hotel").slice(0, 2),
    [listings]
  );

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return { locations: [], listings: [] };

    return {
      locations: locationPool
        .filter((location) => locationHaystack(location).includes(keyword))
        .slice(0, 4),
      listings: listings
        .filter((listing) =>
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
        )
        .slice(0, 3),
    };
  }, [query, locationPool, listings]);

  const workspaceStats = useMemo(
    () => [
      { value: locations.length || 0, label: "destinations indexed" },
      { value: listings.length || 0, label: "local stays available" },
      { value: "Live", label: "planning workspace" },
    ],
    [locations.length, listings.length]
  );

  const rememberRedirect = (path) => {
    if (!user) setAuthRedirect(path);
  };

  const gatedTo = (path) => (user ? path : { pathname: "/login", state: { from: path } });

  const authLinkProps = (path) => ({
    to: gatedTo(path),
    onClick: () => rememberRedirect(path),
  });

  const submitSearch = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      document.getElementById("home-search-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (user) {
      navigate("/explore");
      return;
    }

    document.getElementById("home-destinations")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const navActions = ready
    ? user
      ? [
          { label: "Dashboard", props: { to: "/dashboard" }, className: "home-workspace__nav-link" },
          { label: "Explore", props: { to: "/explore" }, className: "home-workspace__button home-workspace__button--accent" },
        ]
      : [
          { label: "Login", props: { to: "/login" }, className: "home-workspace__nav-link" },
          { label: "Sign up", props: { to: "/signup" }, className: "home-workspace__button home-workspace__button--accent" },
        ]
    : [];

  return (
    <div className="home-workspace">
      <div className="home-workspace__backdrop home-workspace__backdrop--slate" aria-hidden="true" />
      <div className="home-workspace__backdrop home-workspace__backdrop--orange" aria-hidden="true" />
      <div className="home-workspace__grid" aria-hidden="true" />

      <nav className={`home-workspace__nav ${isScrolled ? "home-workspace__nav--scrolled" : ""}`}>
        <Link to="/" className="home-workspace__brand">
          <span className="home-workspace__brand-mark">ST</span>
          <span>
            <strong>Smart Travel Nepal</strong>
            <small>Travel Workspace</small>
          </span>
        </Link>

        <div className="home-workspace__nav-actions">
          {navActions.map((action) => (
            <Link key={action.label} {...action.props} className={action.className}>
              {action.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="home-workspace__main">
        <section className="home-workspace__hero">
          <div className="home-workspace__hero-copy">
            <p className="home-workspace__eyebrow">Travel Workspace</p>
            <h1>Plan Nepal with a cleaner, calmer travel workspace.</h1>
            <p className="home-workspace__lede">
              A premium planning surface for destinations, stays, and routes. High contrast, minimal noise, and tools
              that feel organized from the first click.
            </p>

            <form className="home-workspace__search" onSubmit={submitSearch}>
              <label className="home-workspace__search-shell" htmlFor="home-search">
                <Search size={18} />
                <input
                  id="home-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Mustang, routes, heritage stays, districts..."
                />
              </label>
              <button type="submit" className="home-workspace__button home-workspace__button--accent">
                Search
              </button>
            </form>

            <div className="home-workspace__quick-row">
              {quickSearches.map((item) => (
                <button key={item} type="button" className="home-workspace__chip" onClick={() => setQuery(item)}>
                  {item}
                </button>
              ))}
            </div>

            <div className="home-workspace__cta-row">
              <Link {...authLinkProps("/trip-packages")} className="home-workspace__button home-workspace__button--solid">
                View packages
              </Link>
              <Link {...authLinkProps("/itinerary-planner")} className="home-workspace__button home-workspace__button--ghost">
                Build itinerary
              </Link>
            </div>

            <div className="home-workspace__stats">
              {workspaceStats.map((stat, index) => (
                <article
                  key={stat.label}
                  className="home-workspace__stat"
                  style={{ animationDelay: `${0.28 + index * 0.1}s` }}
                >
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
              ))}
            </div>
          </div>

          <aside className="home-workspace__hero-stage">
            <article className="home-workspace__feature-card">
              <div className="home-workspace__feature-media">
                {heroLocation && locationImage(heroLocation) ? (
                  <img src={locationImage(heroLocation)} alt={heroLocation.name} />
                ) : (
                  <div className="home-workspace__placeholder">{heroLocation?.name || "Featured destination"}</div>
                )}
              </div>
              <div className="home-workspace__feature-content">
                <p className="home-workspace__card-kicker">{heroLocation?.category || "Featured destination"}</p>
                <h2>{heroLocation?.name || "Mustang, Nepal"}</h2>
                <p>
                  {heroLocation?.description ||
                    "A strong destination to start exploring Nepal before opening full trip details."}
                </p>
                <div className="home-workspace__meta-row">
                  <span>{heroLocation?.district || "Mustang District"}</span>
                  <span>{heroLocation?.province || "Nepal"}</span>
                </div>
                {heroLocation ? (
                  <Link {...authLinkProps(`/locations/${heroLocation._id}`)} className="home-workspace__inline-link">
                    See details
                    <ArrowRight size={15} />
                  </Link>
                ) : null}
              </div>
            </article>
          </aside>
        </section>

        {query.trim() ? (
          <section className="home-workspace__section" id="home-search-results">
            <div className="home-workspace__section-head">
              <div>
                <p className="home-workspace__eyebrow">Search Results</p>
              </div>
            </div>

            {searchResults.locations.length === 0 && searchResults.listings.length === 0 ? (
              <div className="home-workspace__state">No places matched your search.</div>
            ) : (
              <div className="home-workspace__search-grid">
                {searchResults.locations.map((location) => (
                  <article key={`search-location-${location._id}`} className="home-workspace__search-card">
                    <span className="home-workspace__search-tag">Destination</span>
                    <h3>{location.name}</h3>
                    <p>{location.description || [location.district, location.province].filter(Boolean).join(", ")}</p>
                    <div className="home-workspace__meta-row home-workspace__meta-row--soft">
                      <span>{location.district || "Nepal"}</span>
                      <span>{location.category || "Destination"}</span>
                    </div>
                    <Link {...authLinkProps(`/locations/${location._id}`)} className="home-workspace__inline-link">
                      See details
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}

                {searchResults.listings.map((listing) => (
                  <article key={`search-listing-${listing._id}`} className="home-workspace__search-card">
                    <span className="home-workspace__search-tag">{listing.type || "Listing"}</span>
                    <h3>{listing.title}</h3>
                    <p>{[listing.location?.name, listing.location?.district].filter(Boolean).join(", ") || "Nepal"}</p>
                    <div className="home-workspace__meta-row home-workspace__meta-row--soft">
                      <span>{formatPriceBadge(listing.pricePerNight || listing.price)}</span>
                    </div>
                    <Link {...authLinkProps(`/places/${listing._id}`)} className="home-workspace__inline-link">
                      See details
                      <ArrowRight size={15} />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section className="home-workspace__section" id="home-destinations">
          <div className="home-workspace__section-head">
            <div>
              <p className="home-workspace__eyebrow">Destinations</p>
            </div>
            <Link {...authLinkProps("/explore")} className="home-workspace__inline-link">
              Explore all
              <ArrowRight size={15} />
            </Link>
          </div>

          {loading ? (
            <div className="home-workspace__state">
              <LoaderCircle size={20} className="home-workspace__spin" />
              <span>Loading destinations...</span>
            </div>
          ) : error ? (
            <div className="home-workspace__state">{error}</div>
          ) : featuredLocations.length ? (
            <div className="home-workspace__destination-grid">
              {featuredLocations.map((location, index) => (
                <article
                  key={location._id}
                  className="home-workspace__destination-card"
                  style={{ animationDelay: `${0.12 + index * 0.08}s` }}
                >
                  <div className="home-workspace__destination-media">
                    {locationImage(location) ? (
                      <img src={locationImage(location)} alt={location.name} />
                    ) : (
                      <div className="home-workspace__placeholder">{location.name}</div>
                    )}
                  </div>
                  <div className="home-workspace__destination-body">
                    <p className="home-workspace__card-kicker">{location.category || "Destination"}</p>
                    <h3>{location.name}</h3>
                    <p>{location.description || "A strong destination with enough character to anchor a full trip plan."}</p>
                    <div className="home-workspace__meta-row home-workspace__meta-row--soft">
                      <span>{location.district || "Nepal"}</span>
                      <span>{location.province || "Province"}</span>
                    </div>
                    <div className="home-workspace__card-actions">
                      <Link {...authLinkProps(`/locations/${location._id}`)} className="home-workspace__inline-link">
                        See details
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="home-workspace__state">No destinations available yet.</div>
          )}
        </section>

        <section className="home-workspace__section home-workspace__section--split">
          <article className="home-workspace__panel">
            <p className="home-workspace__eyebrow">Workspace Tools</p>
            <div className="home-workspace__tool-list">
              {workspaceTools.map((tool, index) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.title}
                    {...authLinkProps(tool.to)}
                    className="home-workspace__tool-card"
                    style={{ animationDelay: `${0.18 + index * 0.08}s` }}
                  >
                    <div className="home-workspace__tool-icon">
                      <Icon size={17} />
                    </div>
                    <div>
                      <h3>{tool.title}</h3>
                      <p>{tool.copy}</p>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                );
              })}
            </div>
          </article>

          <article className="home-workspace__panel home-workspace__panel--warm">
            <p className="home-workspace__eyebrow">Shortlisted Stays</p>
            {loading ? (
              <div className="home-workspace__state home-workspace__state--compact">
                <LoaderCircle size={20} className="home-workspace__spin" />
                <span>Loading stays...</span>
              </div>
            ) : featuredStays.length ? (
              <div className="home-workspace__stay-list">
                {featuredStays.map((listing, index) => (
                  <article
                    key={listing._id}
                    className="home-workspace__stay-card"
                    style={{ animationDelay: `${0.2 + index * 0.08}s` }}
                  >
                    <div className="home-workspace__stay-media">
                      {listingImage(listing) ? (
                        <img src={listingImage(listing)} alt={listing.title} />
                      ) : (
                        <div className="home-workspace__placeholder">{listing.title}</div>
                      )}
                    </div>
                    <div className="home-workspace__stay-body">
                      <div className="home-workspace__stay-top">
                        <div>
                          <h3>{listing.title}</h3>
                          <p>{[listing.location?.name, listing.location?.district].filter(Boolean).join(", ") || "Nepal"}</p>
                        </div>
                        <span className="home-workspace__price-badge">{formatPriceBadge(listing.pricePerNight || listing.price)}</span>
                      </div>
                      <div className="home-workspace__stay-meta">
                        <span>
                          <BedDouble size={14} />
                          Hotel
                        </span>
                      </div>
                      <Link {...authLinkProps(`/places/${listing._id}`)} className="home-workspace__inline-link">
                        Open stay
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="home-workspace__state home-workspace__state--compact">No hotel listings available yet.</div>
            )}
          </article>
        </section>
      </main>

      <style>{`
        .home-workspace {
          --slate-950: #0f172a;
          --slate-900: #162033;
          --slate-800: #22304b;
          --slate-700: #475569;
          --slate-500: #64748b;
          --white: #fcfafa;
          --white-strong: rgba(252, 250, 250, 0.94);
          --white-soft: rgba(252, 250, 250, 0.72);
          --orange: #d97706;
          --orange-deep: #b85f04;
          --line: rgba(15, 23, 42, 0.12);
          --line-strong: rgba(15, 23, 42, 0.18);
          --shadow-soft: 0 28px 70px rgba(15, 23, 42, 0.08);
          --shadow-card: 0 34px 90px rgba(15, 23, 42, 0.12);
          position: relative;
          min-height: 100vh;
          overflow: clip;
          background: var(--white);
          color: var(--slate-950);
        }

        .home-workspace__backdrop,
        .home-workspace__grid {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .home-workspace__backdrop {
          filter: blur(48px);
          opacity: 0.65;
        }

        .home-workspace__backdrop--slate {
          top: -10%;
          right: -12%;
          width: 32vw;
          height: 32vw;
          border-radius: 999px;
          background: rgba(59, 130, 246, 0.08);
        }

        .home-workspace__backdrop--orange {
          top: 8%;
          left: -8%;
          width: 24vw;
          height: 24vw;
          border-radius: 999px;
          background: rgba(217, 119, 6, 0.08);
        }

        .home-workspace__grid {
          background-image:
            linear-gradient(rgba(15, 23, 42, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(15, 23, 42, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.22), transparent 78%);
        }

        .home-workspace__nav,
        .home-workspace__main {
          position: relative;
          z-index: 1;
          max-width: 1440px;
          margin: 0 auto;
          padding-left: 40px;
          padding-right: 40px;
        }

        .home-workspace__nav {
          position: sticky;
          top: 14px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-top: 16px;
          padding-top: 14px;
          padding-bottom: 14px;
          border-radius: 24px;
          background: rgba(252, 250, 250, 0.72);
          border: 1px solid transparent;
          backdrop-filter: blur(0px);
          transition: background 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease, backdrop-filter 0.28s ease;
        }

        .home-workspace__nav--scrolled {
          background: rgba(252, 250, 250, 0.84);
          border-color: rgba(255, 255, 255, 0.46);
          backdrop-filter: blur(18px);
          box-shadow: 0 16px 44px rgba(15, 23, 42, 0.08);
        }

        .home-workspace__brand {
          display: inline-flex;
          align-items: center;
          gap: 14px;
          color: var(--slate-950);
        }

        .home-workspace__brand:hover {
          color: var(--slate-950);
        }

        .home-workspace__brand-mark {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
          border: 1px solid var(--line);
          box-shadow: var(--shadow-soft);
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .home-workspace__brand strong,
        .home-workspace__brand small {
          display: block;
        }

        .home-workspace__brand strong {
          font-family: "Poppins", sans-serif;
          font-size: 1rem;
        }

        .home-workspace__brand small {
          margin-top: 2px;
          color: var(--slate-700);
          font-size: 0.82rem;
        }

        .home-workspace__nav-actions,
        .home-workspace__quick-row,
        .home-workspace__cta-row,
        .home-workspace__meta-row,
        .home-workspace__card-actions,
        .home-workspace__stay-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .home-workspace__button,
        .home-workspace__nav-link,
        .home-workspace__chip {
          border-radius: 999px;
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease,
            background 0.25s ease,
            border-color 0.25s ease,
            color 0.25s ease;
        }

        .home-workspace__button,
        .home-workspace__nav-link {
          min-height: 50px;
          padding: 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.52);
          color: var(--slate-950);
          font-weight: 600;
        }

        .home-workspace__button:hover,
        .home-workspace__nav-link:hover,
        .home-workspace__chip:hover,
        .home-workspace__destination-card:hover,
        .home-workspace__tool-card:hover,
        .home-workspace__stay-card:hover,
        .home-workspace__feature-card:hover,
        .home-workspace__search-card:hover {
          transform: translateY(-3px);
        }

        .home-workspace__button--solid {
          background: var(--slate-950);
          border-color: var(--slate-950);
          color: var(--white);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
        }

        .home-workspace__button--solid:hover {
          color: var(--white);
          background: var(--slate-900);
          border-color: var(--slate-900);
        }

        .home-workspace__button--accent {
          background: linear-gradient(135deg, var(--orange), var(--orange-deep));
          border-color: transparent;
          color: white;
          box-shadow: 0 18px 38px rgba(217, 119, 6, 0.22);
        }

        .home-workspace__button--accent:hover {
          color: white;
        }

        .home-workspace__button--ghost {
          background: rgba(255, 255, 255, 0.34);
        }

        .home-workspace__main {
          padding-top: 44px;
          padding-bottom: 64px;
        }

        .home-workspace__hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(460px, 0.98fr);
          gap: 40px;
          align-items: start;
          min-height: auto;
        }

        .home-workspace__hero-copy > *,
        .home-workspace__stat,
        .home-workspace__destination-card,
        .home-workspace__tool-card,
        .home-workspace__stay-card,
        .home-workspace__state {
          opacity: 0;
          transform: translateY(26px);
          animation: home-workspace-rise 0.78s ease forwards;
        }

        .home-workspace__hero-copy > :nth-child(1) { animation-delay: 0.04s; }
        .home-workspace__hero-copy > :nth-child(2) { animation-delay: 0.12s; }
        .home-workspace__hero-copy > :nth-child(3) { animation-delay: 0.2s; }
        .home-workspace__hero-copy > :nth-child(4) { animation-delay: 0.28s; }
        .home-workspace__hero-copy > :nth-child(5) { animation-delay: 0.36s; }
        .home-workspace__hero-copy > :nth-child(6) { animation-delay: 0.44s; }
        .home-workspace__hero-copy > :nth-child(7) { animation-delay: 0.52s; }

        .home-workspace__eyebrow,
        .home-workspace__panel-kicker,
        .home-workspace__card-kicker {
          margin: 0;
          color: var(--orange);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .home-workspace__hero-copy h1,
        .home-workspace__section-head h2,
        .home-workspace__feature-content h2,
        .home-workspace__panel h2,
        .home-workspace__search-card h3 {
          margin: 0;
          font-family: "Poppins", sans-serif;
          color: #0f172a;
          letter-spacing: -0.05em;
          line-height: 0.94;
        }

        .home-workspace__hero-copy h1 {
          margin-top: 18px;
          max-width: 10ch;
          font-size: clamp(2.7rem, 4.4vw, 4.6rem);
        }

        .home-workspace__lede,
        .home-workspace__feature-content p,
        .home-workspace__destination-body p,
        .home-workspace__tool-card p,
        .home-workspace__stay-body p,
        .home-workspace__search-card p {
          color: var(--slate-700);
          line-height: 1.72;
        }

        .home-workspace__lede {
          margin: 18px 0 0;
          max-width: 44ch;
          font-size: 1rem;
        }

        .home-workspace__search {
          margin-top: 28px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
        }

        .home-workspace__search-shell {
          min-height: 62px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 999px;
          border: 1px solid rgba(217, 119, 6, 0.12);
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 0 0 8px rgba(217, 119, 6, 0.06), 0 18px 44px rgba(15, 23, 42, 0.08);
        }

        .home-workspace__search-shell input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--slate-950);
          font: inherit;
        }

        .home-workspace__search-shell input::placeholder {
          color: var(--slate-500);
        }

        .home-workspace__quick-row {
          margin-top: 14px;
        }

        .home-workspace__chip {
          padding: 10px 15px;
          border: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.62);
          color: var(--slate-800);
          cursor: pointer;
          font: inherit;
          font-weight: 600;
        }

        .home-workspace__cta-row {
          margin-top: 18px;
        }

        .home-workspace__stats {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .home-workspace__stat {
          padding: 20px 18px;
          border-top: 1px solid var(--line-strong);
          background: rgba(255, 255, 255, 0.2);
        }

        .home-workspace__stat strong,
        .home-workspace__stat span {
          display: block;
        }

        .home-workspace__stat strong {
          font-size: 1.65rem;
          letter-spacing: -0.05em;
        }

        .home-workspace__stat span {
          margin-top: 6px;
          color: var(--slate-700);
          font-size: 0.92rem;
        }

        .home-workspace__hero-stage {
          opacity: 0;
          transform: translateY(30px);
          animation: home-workspace-rise 0.9s ease forwards;
          animation-delay: 0.2s;
        }

        .home-workspace__feature-card,
        .home-workspace__destination-card,
        .home-workspace__panel,
        .home-workspace__tool-card,
        .home-workspace__stay-card,
        .home-workspace__state,
        .home-workspace__search-card {
          background: var(--white-strong);
          border: 1px solid var(--line);
          box-shadow: var(--shadow-card);
        }

        .home-workspace__feature-card {
          overflow: hidden;
          border-radius: 32px;
        }

        .home-workspace__feature-media {
          min-height: 320px;
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.3), rgba(226, 232, 240, 0.82));
        }

        .home-workspace__feature-media img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .home-workspace__feature-content {
          padding: 20px;
          background:
            radial-gradient(circle at top right, rgba(217, 119, 6, 0.08), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .home-workspace__feature-content h2 {
          margin-top: 10px;
          font-size: clamp(1.45rem, 2.3vw, 2rem);
        }

        .home-workspace__section {
          margin-top: 64px;
        }

        .home-workspace__section--split {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .home-workspace__section-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }

        .home-workspace__section-head h2 {
          margin-top: 10px;
          max-width: 11ch;
          font-size: clamp(1.45rem, 2vw, 2.1rem);
        }

        .home-workspace__panel h2 {
          margin-top: 10px;
          max-width: 11ch;
          font-size: clamp(1.4rem, 1.9vw, 2rem);
        }

        .home-workspace__destination-grid,
        .home-workspace__tool-list,
        .home-workspace__stay-list,
        .home-workspace__search-grid {
          display: grid;
          gap: 16px;
        }

        .home-workspace__destination-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .home-workspace__destination-card,
        .home-workspace__stay-card,
        .home-workspace__panel {
          border-radius: 30px;
        }

        .home-workspace__destination-card {
          overflow: hidden;
        }

        .home-workspace__destination-media {
          min-height: 240px;
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.3), rgba(226, 232, 240, 0.8));
        }

        .home-workspace__destination-media img,
        .home-workspace__stay-media img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .home-workspace__destination-body,
        .home-workspace__stay-body {
          padding: 20px;
        }

        .home-workspace__destination-body h3,
        .home-workspace__tool-card h3,
        .home-workspace__stay-body h3 {
          margin: 10px 0 0;
          font-size: 1.02rem;
          line-height: 1.28;
          color: var(--slate-950);
        }

        .home-workspace__meta-row {
          margin-top: 14px;
        }

        .home-workspace__meta-row span {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: var(--slate-800);
          font-size: 0.82rem;
        }

        .home-workspace__meta-row--soft span {
          background: rgba(15, 23, 42, 0.04);
        }

        .home-workspace__search-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .home-workspace__search-card {
          padding: 20px;
          border-radius: 24px;
        }

        .home-workspace__search-tag {
          display: inline-flex;
          align-items: center;
          padding: 7px 10px;
          border-radius: 999px;
          background: rgba(217, 119, 6, 0.08);
          color: var(--orange-deep);
          font-size: 0.76rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .home-workspace__panel {
          padding: 22px;
          display: grid;
          align-content: start;
        }

        .home-workspace__panel--warm {
          background:
            radial-gradient(circle at top right, rgba(217, 119, 6, 0.08), transparent 32%),
            var(--white-strong);
        }

        .home-workspace__tool-card {
          padding: 16px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 14px;
          align-items: start;
          border-radius: 24px;
          color: var(--slate-950);
        }

        .home-workspace__tool-card:hover {
          color: var(--slate-950);
        }

        .home-workspace__tool-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(217, 119, 6, 0.1);
          color: var(--orange);
        }

        .home-workspace__stay-card {
          overflow: hidden;
        }

        .home-workspace__stay-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
        }

        .home-workspace__stay-media {
          min-height: 180px;
          background: linear-gradient(135deg, rgba(148, 163, 184, 0.26), rgba(226, 232, 240, 0.82));
        }

        .home-workspace__stay-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .home-workspace__price-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.06);
          border: 1px solid rgba(15, 23, 42, 0.08);
          color: var(--slate-900);
          font-size: 0.78rem;
          font-weight: 700;
          white-space: nowrap;
        }

        .home-workspace__stay-meta span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(217, 119, 6, 0.08);
          color: var(--orange-deep);
          font-size: 0.84rem;
          font-weight: 600;
        }

        .home-workspace__inline-link {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--slate-950);
          font-weight: 600;
        }

        .home-workspace__placeholder,
        .home-workspace__state {
          display: grid;
          place-items: center;
          text-align: center;
        }

        .home-workspace__placeholder {
          min-height: 180px;
          padding: 24px;
          color: var(--slate-500);
        }

        .home-workspace__state {
          min-height: 180px;
          padding: 28px;
          border-radius: 28px;
          color: var(--slate-700);
        }

        .home-workspace__state--compact {
          min-height: 120px;
        }

        .home-workspace__spin {
          animation: home-workspace-spin 1s linear infinite;
        }

        @keyframes home-workspace-rise {
          from {
            opacity: 0;
            transform: translateY(26px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes home-workspace-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1200px) {
          .home-workspace__hero,
          .home-workspace__section--split,
          .home-workspace__destination-grid,
          .home-workspace__search-grid {
            grid-template-columns: 1fr;
          }

          .home-workspace__stay-list {
            grid-template-columns: 1fr;
          }

          .home-workspace__hero-copy h1 {
            max-width: 10ch;
            font-size: clamp(2.6rem, 5vw, 4rem);
          }

          .home-workspace__section-head h2,
          .home-workspace__panel h2 {
            max-width: 12ch;
          }
        }

        @media (max-width: 820px) {
          .home-workspace__nav,
          .home-workspace__section-head,
          .home-workspace__stay-top {
            flex-direction: column;
            align-items: stretch;
          }

          .home-workspace__nav,
          .home-workspace__main {
            padding-left: 20px;
            padding-right: 20px;
          }

          .home-workspace__search,
          .home-workspace__stats {
            grid-template-columns: 1fr;
          }

          .home-workspace__hero-copy h1,
          .home-workspace__section-head h2,
          .home-workspace__feature-content h2,
          .home-workspace__panel h2 {
            max-width: none;
          }

          .home-workspace__hero-copy h1 {
            font-size: clamp(2.25rem, 10vw, 3.4rem);
            line-height: 0.98;
          }

          .home-workspace__destination-media {
            min-height: 200px;
          }

          .home-workspace__stay-media {
            min-height: 160px;
          }

          .home-workspace__feature-media {
            min-height: 220px;
          }

          .home-workspace__nav-actions,
          .home-workspace__cta-row {
            width: 100%;
          }

          .home-workspace__nav-link,
          .home-workspace__button {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-workspace *,
          .home-workspace *::before,
          .home-workspace *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }

          .home-workspace__hero-copy > *,
          .home-workspace__hero-stage,
          .home-workspace__stat,
          .home-workspace__destination-card,
          .home-workspace__tool-card,
          .home-workspace__stay-card,
          .home-workspace__state {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
