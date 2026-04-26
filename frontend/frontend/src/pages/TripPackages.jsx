import React, { useEffect, useMemo, useState } from "react";
import { Calendar, CheckCircle2, MapPin, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

export default function TripPackages() {
  const [packages, setPackages] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLocation, setActiveLocation] = useState("All");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true);
        const [packagesRes, locationsRes] = await Promise.all([
          api.get("/api/trip-packages"),
          api.get("/api/locations"),
        ]);
        const data = packagesRes.data;
        const list = Array.isArray(data?.packages) ? data.packages : [];
        setPackages(list);
        setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : []);
        setError("");
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load trip packages");
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, []);

  const cheapestPackage = useMemo(() => {
    if (!packages.length) return null;
    return packages.reduce((lowest, current) => {
      const currentPrice = Number(current.discountPrice || current.basePrice || 0);
      const lowestPrice = Number(lowest.discountPrice || lowest.basePrice || 0);
      return currentPrice < lowestPrice ? current : lowest;
    }, packages[0]);
  }, [packages]);

  const locationFilters = useMemo(
    () => ["All", ...Array.from(new Set(packages.map((pkg) => pkg.location).filter(Boolean)))],
    [packages]
  );

  const filteredPackages = useMemo(
    () =>
      packages.filter((pkg) => {
        const matchesLocation = activeLocation === "All" || pkg.location === activeLocation;
        const matchesDate = isDateRangeMatch(pkg.startDate, pkg.endDate, startDateFilter, endDateFilter);
        return matchesLocation && matchesDate;
      }),
    [packages, activeLocation, startDateFilter, endDateFilter]
  );

  const featuredPackage = useMemo(() => {
    if (!filteredPackages.length) return null;
    return (
      filteredPackages.find((pkg) => pkg.isFeatured) ||
      filteredPackages.reduce((best, current) => {
        const bestScore = Number(best.rating || 0);
        const currentScore = Number(current.rating || 0);
        return currentScore > bestScore ? current : best;
      }, filteredPackages[0])
    );
  }, [filteredPackages]);

  const featuredPackageId = featuredPackage?._id || "";
  const listPackages = useMemo(
    () => filteredPackages.filter((pkg) => pkg._id !== featuredPackageId),
    [filteredPackages, featuredPackageId]
  );

  const locationImageMap = useMemo(() => {
    const pairs = (Array.isArray(locations) ? locations : []).map((location) => [
      String(location?.name || "").trim().toLowerCase(),
      resolveImageUrl(location?.image || location?.images?.[0] || ""),
    ]);
    return new Map(pairs.filter(([, image]) => Boolean(image)));
  }, [locations]);

  const getPackageImage = (pkg) =>
    locationImageMap.get(String(pkg?.location || "").trim().toLowerCase()) ||
    resolveImageUrl(pkg?.coverImage) ||
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80";

  return (
    <div className="trip-packages-page">
      <header className="trip-packages-hero">
        <div className="trip-packages-hero__copy">
          <p className="trip-packages-kicker">Trip Packages</p>
          <h1>Travel Nepal through curated packages that already feel bookable</h1>
          <p>
            Browse polished departures with real itinerary structure, hotel stays, included activities, and a booking
            flow that continues into full package details.
          </p>
          <div className="trip-packages-hero__badges">
            <span><ShieldCheck size={15} /> Verified package content</span>
            <span><Sparkles size={15} /> Day-wise itinerary</span>
            <span><CheckCircle2 size={15} /> Flexible add-ons</span>
          </div>
        </div>
        <div className="trip-packages-hero__stats">
          <div>
            <span>Live packages</span>
            <strong>{packages.length}</strong>
          </div>
          <div>
            <span>Starting from</span>
            <strong>
              {cheapestPackage
                ? `${cheapestPackage.currency || "NPR"} ${Number(
                    cheapestPackage.discountPrice || cheapestPackage.basePrice || 0
                  )}`
                : "-"}
            </strong>
          </div>
          <div>
            <span>Featured regions</span>
            <strong>{locationFilters.length > 1 ? locationFilters.length - 1 : 0}</strong>
          </div>
        </div>
      </header>

      {error && <p className="trip-packages-error">{error}</p>}
      {loading && <p className="trip-packages-hint">Loading trip packages...</p>}
      {!loading && packages.length === 0 && <p className="trip-packages-hint">No trip packages available yet.</p>}

      {!loading && packages.length > 0 && (
        <>
          <section className="trip-filter-bar">
            <div className="trip-filter-group">
              <span className="trip-filter-label">Destination</span>
              <div className="trip-filter-chips">
                {locationFilters.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`trip-filter-chip ${activeLocation === item ? "is-active" : ""}`}
                    onClick={() => setActiveLocation(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="trip-filter-group">
              <span className="trip-filter-label">Travel dates</span>
              <div className="trip-filter-dates">
                <input type="date" value={startDateFilter} onChange={(event) => setStartDateFilter(event.target.value)} />
                <input
                  type="date"
                  value={endDateFilter}
                  min={startDateFilter || undefined}
                  onChange={(event) => setEndDateFilter(event.target.value)}
                />
              </div>
            </div>

          </section>

          {featuredPackage && (
            <section className="trip-spotlight">
              <div className="trip-spotlight__media">
                <img
                  src={
                    getPackageImage(featuredPackage)
                  }
                  alt={featuredPackage.title}
                />
                <div className="trip-spotlight__veil" />
              </div>
              <div className="trip-spotlight__content">
                <p className="trip-spotlight__kicker">{featuredPackage.isFeatured ? "Top Pick" : "Featured Escape"}</p>
                <h2>{featuredPackage.title}</h2>
                <p>{featuredPackage.shortDescription || featuredPackage.description}</p>
                <div className="trip-spotlight__meta">
                  <span><MapPin size={14} /> {featuredPackage.location || "Nepal"}</span>
                  <span><Calendar size={14} /> {getTripDays(featuredPackage.startDate, featuredPackage.endDate)} days</span>
                  <span><Star size={14} /> {Number(featuredPackage.rating || 0).toFixed(1)}</span>
                </div>
                <div className="trip-spotlight__actions">
                  <button
                    type="button"
                    className="trip-package-btn"
                    onClick={() => navigate(`/trip-packages/${featuredPackage._id}`)}
                  >
                    Explore this package
                  </button>
                  <div className="trip-spotlight__price">
                    <span>From</span>
                    <strong>
                      {featuredPackage.currency || "NPR"}{" "}
                      {Number(featuredPackage.discountPrice || featuredPackage.basePrice || 0)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          <div className="trip-results-head">
            <div>
              <h2>Available packages</h2>
              <p>{listPackages.length} package{listPackages.length === 1 ? "" : "s"} match your current view.</p>
            </div>
            {activeLocation !== "All" && (
              <button
                type="button"
                className="trip-package-toggle"
                onClick={() => {
                  setActiveLocation("All");
                  setStartDateFilter("");
                  setEndDateFilter("");
                }}
              >
                Reset filters
              </button>
            )}
            {activeLocation === "All" && (startDateFilter || endDateFilter) && (
              <button
                type="button"
                className="trip-package-toggle"
                onClick={() => {
                  setStartDateFilter("");
                  setEndDateFilter("");
                }}
              >
                Reset filters
              </button>
            )}
          </div>
        </>
      )}

      <section className="trip-packages-grid">
        {listPackages.map((pkg) => {
          const price = Number(pkg.discountPrice || pkg.basePrice || 0);
          return (
            <article key={pkg._id} className="trip-package-card trip-package-card--browse">
              <div className="trip-package-card__media">
                <img
                  src={getPackageImage(pkg)}
                  alt={pkg.title}
                />
                <div className="trip-package-card__veil" />
              </div>

              <div className="trip-package-card__content">
                <div className="trip-package-card__head">
                  <p className="trip-package-card__kicker">{pkg.isFeatured ? "Top Pick" : pkg.tripType || "Curated Trip"}</p>
                  <h3>{pkg.title}</h3>
                  <p>{pkg.shortDescription || pkg.description || "Structured travel package with curated stay and activity planning."}</p>
                </div>

                <div className="trip-package-card__meta">
                  <span><MapPin size={14} /> {pkg.location || "Nepal"}</span>
                  <span><Calendar size={14} /> {getTripDays(pkg.startDate, pkg.endDate)} days</span>
                  <span><Star size={14} /> {Number(pkg.rating || 0).toFixed(1)}</span>
                </div>

                <div className="trip-package-card__footer">
                  <button
                    type="button"
                    className="trip-package-btn"
                    onClick={() => navigate(`/trip-packages/${pkg._id}`)}
                  >
                    Explore this package
                  </button>
                  <div className="trip-package-card__price">
                    <span>From</span>
                    <strong>{pkg.currency || "NPR"} {price}</strong>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
        {!loading && packages.length > 0 && listPackages.length === 0 && (
          <article className="trip-packages-empty">
            <h3>{featuredPackage ? "No more packages in this view" : "No packages match these filters"}</h3>
            <p>{featuredPackage ? "The top featured package is shown above." : "Try switching destination to see more curated options."}</p>
          </article>
        )}
      </section>

      <style>{`
        .trip-packages-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 28px 18px 60px;
          font-family: "Manrope", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: #1f2937;
        }
        .trip-packages-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
          gap: 18px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 248, 244, 0.9)),
            linear-gradient(135deg, rgba(255, 160, 122, 0.08), rgba(125, 211, 252, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 32px;
          padding: 28px;
          margin-bottom: 22px;
          box-shadow: 0 22px 42px rgba(15, 23, 42, 0.07);
          backdrop-filter: blur(14px);
        }
        .trip-packages-kicker {
          margin: 0 0 8px;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
        }
        .trip-packages-hero h1 {
          margin: 0 0 10px;
          font-size: clamp(2rem, 4vw, 3rem);
          line-height: 1.06;
          letter-spacing: -0.03em;
          font-family: "Playfair Display", serif;
        }
        .trip-packages-hero p {
          margin: 0;
          color: #475569;
          line-height: 1.7;
          max-width: 58ch;
        }
        .trip-packages-hero__badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 16px;
        }
        .trip-packages-hero__badges span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.82);
          font-size: 0.84rem;
          font-weight: 600;
          color: #0f172a;
        }
        .trip-packages-hero__stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          align-self: end;
        }
        .trip-packages-hero__stats div {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.82);
        }
        .trip-packages-hero__stats span {
          color: #64748b;
          font-size: 0.75rem;
        }
        .trip-packages-hero__stats strong {
          font-size: 1rem;
        }
        .trip-packages-error { color: #b91c1c; margin: 10px 0; }
        .trip-packages-hint { color: #475569; margin: 10px 0; }
        .trip-filter-bar {
          display: grid;
          gap: 16px;
          padding: 18px 20px;
          margin: 18px 0 20px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top left, rgba(254, 215, 170, 0.28), transparent 30%),
            linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(248, 250, 252, 0.94));
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.05);
        }
        .trip-filter-group {
          display: grid;
          gap: 10px;
        }
        .trip-filter-dates {
          display: grid;
          grid-template-columns: repeat(2, minmax(180px, 220px));
          gap: 10px;
        }
        .trip-filter-dates input {
          min-height: 44px;
          border-radius: 14px;
          border: 1px solid rgba(203, 213, 225, 0.95);
          background: rgba(255, 255, 255, 0.88);
          padding: 0 14px;
          color: #334155;
          font: inherit;
        }
        .trip-filter-label {
          font-size: 0.78rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #64748b;
          font-weight: 800;
        }
        .trip-filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .trip-filter-chip {
          border: 1px solid rgba(203, 213, 225, 0.95);
          background: rgba(255, 255, 255, 0.88);
          color: #334155;
          border-radius: 999px;
          padding: 10px 14px;
          font-weight: 700;
          cursor: pointer;
        }
        .trip-filter-chip.is-active {
          background: linear-gradient(135deg, #11355a, #356d97);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 12px 24px rgba(17, 53, 90, 0.2);
        }
        .trip-spotlight {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
          gap: 0;
          overflow: hidden;
          border-radius: 36px;
          background: #17385a;
          margin-bottom: 24px;
          box-shadow: 0 24px 44px rgba(15, 23, 42, 0.12);
        }
        .trip-spotlight__media {
          position: relative;
          min-height: 420px;
        }
        .trip-spotlight__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .trip-spotlight__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(15, 23, 42, 0.08), rgba(23, 56, 90, 0.28));
        }
        .trip-spotlight__content {
          display: grid;
          align-content: center;
          gap: 18px;
          padding: 40px;
          color: #f8fafc;
          background:
            radial-gradient(circle at top right, rgba(125, 211, 252, 0.12), transparent 34%),
            linear-gradient(180deg, rgba(23, 56, 90, 0.98), rgba(19, 49, 79, 0.96));
        }
        .trip-spotlight__kicker {
          margin: 0;
          color: #dbeafe;
          text-transform: uppercase;
          letter-spacing: 0.24em;
          font-size: 0.78rem;
          font-weight: 800;
        }
        .trip-spotlight__content h2 {
          margin: 0;
          font-size: clamp(2rem, 3vw, 3rem);
          line-height: 1.1;
          font-family: "Playfair Display", serif;
        }
        .trip-spotlight__content p {
          margin: 0;
          color: rgba(248, 250, 252, 0.86);
          line-height: 1.7;
        }
        .trip-spotlight__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 18px;
        }
        .trip-spotlight__meta span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #f8fafc;
          font-weight: 700;
          font-size: 1rem;
        }
        .trip-spotlight__actions {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 18px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .trip-spotlight__price,
        .trip-package-card__price {
          display: grid;
          gap: 4px;
          padding: 9px 11px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          min-width: 108px;
        }
        .trip-spotlight__price span,
        .trip-package-card__price span {
          color: #dbeafe;
          font-size: 0.72rem;
        }
        .trip-spotlight__price strong,
        .trip-package-card__price strong {
          font-size: 0.88rem;
          color: #fff;
        }
        .trip-results-head {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          margin: 8px 0 16px;
        }
        .trip-results-head h2 {
          margin: 0 0 4px;
          font-size: 1.5rem;
        }
        .trip-results-head p {
          margin: 0;
          color: #64748b;
        }
        .trip-packages-grid {
          display: grid;
          gap: 18px;
        }
        .trip-package-card--browse {
          display: grid;
          grid-template-columns: minmax(220px, 0.88fr) minmax(280px, 1fr);
          overflow: hidden;
          border-radius: 24px;
          background: #17385a;
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
        }
        .trip-package-card__media {
          position: relative;
          min-height: 165px;
        }
        .trip-package-card__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .trip-package-card__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(23, 56, 90, 0.05));
        }
        .trip-package-card__content {
          display: grid;
          align-content: center;
          gap: 8px;
          padding: 16px 18px;
          background:
            radial-gradient(circle at top right, rgba(125, 211, 252, 0.1), transparent 34%),
            linear-gradient(180deg, rgba(23, 56, 90, 0.98), rgba(19, 49, 79, 0.96));
          color: #f8fafc;
        }
        .trip-package-card__head {
          display: grid;
          gap: 5px;
        }
        .trip-package-card__kicker {
          margin: 0;
          color: #dbeafe;
          text-transform: uppercase;
          letter-spacing: 0.22em;
          font-size: 0.62rem;
          font-weight: 800;
        }
        .trip-package-card__head h3 {
          margin: 0;
          font-size: clamp(1.05rem, 1.4vw, 1.35rem);
          line-height: 1.1;
          font-family: "Playfair Display", serif;
        }
        .trip-package-card__head p {
          margin: 0;
          color: rgba(248, 250, 252, 0.86);
          line-height: 1.4;
          font-size: 0.78rem;
        }
        .trip-package-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 10px;
        }
        .trip-package-card__meta span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #f8fafc;
          font-weight: 700;
          font-size: 0.76rem;
        }
        .trip-package-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .trip-package-btn {
          border: none;
          border-radius: 999px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #ff7d57, #ff5f57);
          color: #fff;
          font-weight: 800;
          font-size: 0.75rem;
          cursor: pointer;
          box-shadow: 0 18px 28px rgba(255, 111, 97, 0.24);
        }
        .trip-package-toggle {
          border: none;
          background: rgba(255, 111, 97, 0.12);
          color: #e25a4f;
          font-weight: 700;
          border-radius: 999px;
          padding: 10px 12px;
          cursor: pointer;
          font-size: 0.82rem;
        }
        .trip-packages-empty {
          padding: 28px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.94));
          border: 1px solid rgba(226, 232, 240, 0.92);
          text-align: center;
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.05);
        }
        .trip-packages-empty h3 {
          margin: 0 0 8px;
          font-size: 1.3rem;
        }
        .trip-packages-empty p {
          margin: 0;
          color: #64748b;
        }
        @media (max-width: 960px) {
          .trip-packages-hero,
          .trip-spotlight,
          .trip-package-card--browse {
            grid-template-columns: 1fr;
          }
          .trip-packages-hero__stats {
            grid-template-columns: 1fr;
          }
          .trip-spotlight__media,
          .trip-package-card__media {
            min-height: 170px;
          }
        }
        @media (max-width: 640px) {
          .trip-packages-page {
            padding-left: 14px;
            padding-right: 14px;
          }
          .trip-packages-hero,
          .trip-filter-bar,
          .trip-spotlight__content,
          .trip-package-card__content {
            padding: 16px;
          }
          .trip-filter-dates {
            grid-template-columns: 1fr;
          }
          .trip-spotlight__content h2,
          .trip-package-card__head h3 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}

function getTripDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

function isDateRangeMatch(startDate, endDate, filterStart, filterEnd) {
  if (!filterStart && !filterEnd) return true;
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

  if (filterStart) {
    const selectedStart = new Date(filterStart);
    selectedStart.setHours(0, 0, 0, 0);
    if (end < selectedStart) return false;
  }

  if (filterEnd) {
    const selectedEnd = new Date(filterEnd);
    selectedEnd.setHours(23, 59, 59, 999);
    if (start > selectedEnd) return false;
  }

  return true;
}
