import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BedDouble,
  CalendarDays,
  Compass,
  CreditCard,
  FileText,
  LoaderCircle,
  MapPin,
  PackageSearch,
  Search,
  Users,
  X,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

const SEARCH_DEBOUNCE_MS = 260;

const searchableText = (...values) =>
  values
    .flat()
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const matchesTerm = (term, ...values) => searchableText(...values).includes(term.toLowerCase());

const pickBookingName = (booking) =>
  booking?.tripPackageId?.title ||
  booking?.packageSnapshot?.title ||
  booking?.listingId?.title ||
  booking?.locationId?.name ||
  "Travel booking";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
};

const resultGroups = [
  { key: "destinations", label: "Destinations", icon: MapPin },
  { key: "packages", label: "Packages", icon: PackageSearch },
  { key: "stays", label: "Stays & places", icon: BedDouble },
  { key: "community", label: "Community", icon: FileText },
  { key: "buddies", label: "Travel buddies", icon: Users },
  { key: "bookings", label: "My bookings", icon: CreditCard },
];

const emptyResults = {
  destinations: [],
  packages: [],
  stays: [],
  community: [],
  buddies: [],
  bookings: [],
};

async function safeRequest(request, fallback) {
  try {
    return await request();
  } catch {
    return fallback;
  }
}

async function runGlobalSearch(term) {
  const encoded = encodeURIComponent(term);
  const [
    locationsRes,
    listingsRes,
    packagesRes,
    postsRes,
    plansRes,
    bookingsRes,
  ] = await Promise.all([
    safeRequest(() => api.get("/api/locations"), { data: [] }),
    safeRequest(() => api.get(`/api/listings?city=${encoded}&limit=10`), { data: { listings: [] } }),
    safeRequest(() => api.get("/api/trip-packages"), { data: { packages: [] } }),
    safeRequest(() => api.get(`/api/posts?destination=${encoded}`), { data: { posts: [] } }),
    safeRequest(() => api.get(`/api/travel-plans?destination=${encoded}`), { data: { travelPlans: [] } }),
    safeRequest(() => api.get("/api/bookings/me"), { data: { bookings: [] } }),
  ]);

  const locations = (Array.isArray(locationsRes.data) ? locationsRes.data : [])
    .filter((item) =>
      matchesTerm(term, item?.name, item?.district, item?.province, item?.category, item?.description)
    )
    .slice(0, 5)
    .map((item) => ({
      id: `destination-${item._id}`,
      title: item.name || "Destination",
      meta: [item.district, item.province].filter(Boolean).join(", ") || "Destination",
      description: item.category || item.description || "Open destination details",
      to: `/locations/${item._id}`,
    }));

  const packages = (Array.isArray(packagesRes.data?.packages) ? packagesRes.data.packages : [])
    .filter((item) =>
      matchesTerm(
        term,
        item?.title,
        item?.location,
        item?.region,
        item?.tripType,
        item?.shortDescription,
        item?.description
      )
    )
    .slice(0, 5)
    .map((item) => ({
      id: `package-${item._id}`,
      title: item.title || "Trip package",
      meta: [item.location, item.tripType].filter(Boolean).join(" / ") || "Curated package",
      description: item.startDate ? `Starts ${formatDate(item.startDate)}` : "Open package details",
      to: `/trip-packages/${item._id}`,
    }));

  const listings = (Array.isArray(listingsRes.data?.listings) ? listingsRes.data.listings : [])
    .filter((item) =>
      matchesTerm(
        term,
        item?.title,
        item?.type,
        item?.description,
        item?.location?.name,
        item?.location?.district,
        item?.location?.province
      )
    )
    .slice(0, 5)
    .map((item) => ({
      id: `listing-${item._id}`,
      title: item.title || "Place",
      meta: [item.type, item.location?.district || item.location?.name].filter(Boolean).join(" / ") || "Stay or place",
      description: item.pricePerUnit ? `NPR ${Number(item.pricePerUnit).toLocaleString()}` : "Open place details",
      to: `/places/${item._id}`,
    }));

  const posts = (Array.isArray(postsRes.data?.posts) ? postsRes.data.posts : [])
    .filter((item) => matchesTerm(term, item?.title, item?.content, item?.destination, item?.tags))
    .slice(0, 4)
    .map((item) => ({
      id: `post-${item._id}`,
      title: item.title || item.content?.slice(0, 60) || "Community post",
      meta: [item.destination, item.type].filter(Boolean).join(" / ") || "Community",
      description: item.userId?.name ? `By ${item.userId.name}` : "Open community post",
      to: `/community/posts/${item._id}`,
    }));

  const travelPlans = (Array.isArray(plansRes.data?.travelPlans) ? plansRes.data.travelPlans : [])
    .filter((item) =>
      matchesTerm(term, item?.title, item?.destination, item?.travelStyle, item?.interests, item?.description)
    )
    .slice(0, 4)
    .map((item) => ({
      id: `plan-${item._id}`,
      title: item.title || `${item.destination || "Travel"} plan`,
      meta: [item.destination, item.travelStyle].filter(Boolean).join(" / ") || "Travel buddy plan",
      description:
        item.startDate || item.endDate
          ? `${formatDate(item.startDate)}${item.endDate ? ` - ${formatDate(item.endDate)}` : ""}`
          : "Open buddy plans",
      to: "/buddy/browse",
    }));

  const bookings = (Array.isArray(bookingsRes.data?.bookings) ? bookingsRes.data.bookings : [])
    .filter((item) =>
      matchesTerm(
        term,
        pickBookingName(item),
        item?.bookingStatus,
        item?.paymentStatus,
        item?.bookingType,
        item?.locationId?.district,
        item?.locationId?.province,
        item?.listingId?.location?.district
      )
    )
    .slice(0, 4)
    .map((item) => ({
      id: `booking-${item._id}`,
      title: pickBookingName(item),
      meta: [item.bookingStatus, item.paymentStatus].filter(Boolean).join(" / ") || "Booking",
      description: item.amount ? `NPR ${Number(item.amount).toLocaleString()}` : "Open booking",
      to: `/bookings/${item._id}`,
    }));

  return {
    destinations: locations,
    packages,
    stays: listings,
    community: posts,
    buddies: travelPlans,
    bookings,
  };
}

export default function GlobalSearch({ variant = "inline", className = "" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmedQuery = query.trim();
  const totalResults = useMemo(
    () => Object.values(results).reduce((sum, items) => sum + items.length, 0),
    [results]
  );

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    if (!trimmedQuery) {
      setResults(emptyResults);
      setError("");
      setLoading(false);
      return undefined;
    }

    let active = true;
    const timerId = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const nextResults = await runGlobalSearch(trimmedQuery);
        if (!active) return;
        setResults(nextResults);
      } catch {
        if (!active) return;
        setResults(emptyResults);
        setError("Search is unavailable right now.");
      } finally {
        if (active) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [open, trimmedQuery]);

  const openResult = (to) => {
    setOpen(false);
    setQuery("");
    navigate(to);
  };

  return (
    <>
      <button
        type="button"
        className={`global-search-trigger global-search-trigger--${variant} ${className}`}
        onClick={() => setOpen(true)}
        aria-label="Open global search"
      >
        <Search size={variant === "floating" ? 18 : 16} />
        <span>Search</span>
      </button>

      {open ? (
        <div className="global-search-modal" role="dialog" aria-modal="true" aria-label="Global search">
          <button type="button" className="global-search-modal__backdrop" onClick={() => setOpen(false)} aria-label="Close search" />
          <section className="global-search-panel">
            <div className="global-search-box">
              <Search size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search destinations, packages, stays, posts, buddies, bookings..."
              />
              {loading ? <LoaderCircle className="global-search-spin" size={18} /> : null}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close search">
                <X size={18} />
              </button>
            </div>

            {!trimmedQuery ? (
              <div className="global-search-empty">
                <Compass size={28} />
                <h2>Search your travel workspace</h2>
                <p>Try Mustang, Pokhara, hotel, paid, safari, itinerary, or a booking status.</p>
              </div>
            ) : error ? (
              <p className="global-search-state global-search-state--error">{error}</p>
            ) : !loading && totalResults === 0 ? (
              <p className="global-search-state">No matches found for “{trimmedQuery}”.</p>
            ) : (
              <div className="global-search-results">
                {resultGroups.map((group) => {
                  const items = results[group.key] || [];
                  if (!items.length) return null;
                  const Icon = group.icon;
                  return (
                    <div key={group.key} className="global-search-group">
                      <div className="global-search-group__title">
                        <Icon size={16} />
                        <span>{group.label}</span>
                      </div>
                      <div className="global-search-group__items">
                        {items.map((item) => (
                          <button key={item.id} type="button" onClick={() => openResult(item.to)}>
                            <strong>{item.title}</strong>
                            <span>{item.meta}</span>
                            <small>{item.description}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}

      <style>{`
        .global-search-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(203, 213, 225, 0.85);
          background: rgba(255, 255, 255, 0.9);
          color: #334155;
          font: inherit;
          font-weight: 800;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .global-search-trigger:hover {
          transform: translateY(-1px);
          background: #ffffff;
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
        }

        .global-search-trigger--inline {
          min-height: 38px;
          border-radius: 999px;
          padding: 0 14px;
        }

        .global-search-trigger--floating {
          position: fixed;
          right: 22px;
          bottom: 22px;
          z-index: 45;
          min-height: 48px;
          border-radius: 999px;
          padding: 0 18px;
          color: #ffffff;
          border-color: transparent;
          background: linear-gradient(135deg, #0f172a, #2563eb);
          box-shadow: 0 20px 44px rgba(37, 99, 235, 0.28);
        }

        .global-search-trigger--floating:hover {
          background: linear-gradient(135deg, #111827, #1d4ed8);
        }

        .global-search-modal {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: start center;
          padding: 72px 18px 24px;
        }

        .global-search-modal__backdrop {
          position: absolute;
          inset: 0;
          border: 0;
          background: rgba(15, 23, 42, 0.48);
          backdrop-filter: blur(8px);
          cursor: default;
        }

        .global-search-panel {
          position: relative;
          width: min(100%, 880px);
          max-height: min(760px, calc(100vh - 96px));
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          background: rgba(248, 250, 252, 0.96);
          box-shadow: 0 30px 80px rgba(15, 23, 42, 0.26);
        }

        .global-search-box {
          display: grid;
          grid-template-columns: auto 1fr auto auto;
          align-items: center;
          gap: 12px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(226, 232, 240, 0.95);
          background: #ffffff;
          color: #2563eb;
        }

        .global-search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #0f172a;
          font: inherit;
          font-size: 1rem;
          font-weight: 700;
        }

        .global-search-box input::placeholder {
          color: #94a3b8;
          font-weight: 600;
        }

        .global-search-box button {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 999px;
          background: #f1f5f9;
          color: #475569;
          cursor: pointer;
        }

        .global-search-spin {
          animation: global-search-spin 0.8s linear infinite;
          color: #2563eb;
        }

        .global-search-empty,
        .global-search-state {
          display: grid;
          place-items: center;
          text-align: center;
          gap: 10px;
          min-height: 280px;
          padding: 28px;
          color: #64748b;
        }

        .global-search-empty h2 {
          margin: 0;
          color: #0f172a;
          font-size: 1.35rem;
        }

        .global-search-empty p,
        .global-search-state {
          margin: 0;
          line-height: 1.6;
        }

        .global-search-state--error {
          color: #be123c;
        }

        .global-search-results {
          display: grid;
          gap: 16px;
          max-height: calc(100vh - 190px);
          overflow: auto;
          padding: 18px;
        }

        .global-search-group {
          display: grid;
          gap: 10px;
        }

        .global-search-group__title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #475569;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .global-search-group__items {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .global-search-group__items button {
          display: grid;
          gap: 4px;
          min-height: 106px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 18px;
          background: #ffffff;
          padding: 14px;
          text-align: left;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .global-search-group__items button:hover,
        .global-search-group__items button:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(37, 99, 235, 0.34);
          box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
          outline: none;
        }

        .global-search-group__items strong {
          color: #0f172a;
          line-height: 1.25;
        }

        .global-search-group__items span {
          color: #2563eb;
          font-size: 0.84rem;
          font-weight: 800;
        }

        .global-search-group__items small {
          color: #64748b;
          line-height: 1.45;
        }

        @keyframes global-search-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 700px) {
          .global-search-modal {
            padding: 14px;
            place-items: stretch;
          }

          .global-search-panel {
            max-height: calc(100vh - 28px);
            border-radius: 22px;
          }

          .global-search-box {
            grid-template-columns: auto 1fr auto;
          }

          .global-search-box input {
            font-size: 0.9rem;
          }

          .global-search-spin {
            display: none;
          }

          .global-search-group__items {
            grid-template-columns: 1fr;
          }

          .global-search-trigger--floating {
            right: 14px;
            bottom: 14px;
          }
        }
      `}</style>
    </>
  );
}

export function FloatingGlobalSearch() {
  const location = useLocation();
  const { user } = useAuth();
  const floatingPaths = new Set(["/dashboard", "/map-explorer"]);
  const floatingPrefixes = ["/buddy", "/community"];
  const shouldFloat =
    floatingPaths.has(location.pathname) ||
    floatingPrefixes.some((prefix) => location.pathname.startsWith(prefix));
  if (!user || user.role === "admin" || !shouldFloat) return null;
  return <GlobalSearch variant="floating" />;
}
