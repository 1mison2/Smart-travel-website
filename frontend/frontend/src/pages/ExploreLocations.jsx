import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

export default function ExploreLocations() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/locations");
        if (!active) return;
        setLocations(Array.isArray(data) ? data : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load locations");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return locations;
    return locations.filter((location) =>
      [location.name, location.province, location.district, location.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [locations, query]);

  return (
    <div className="explore-page">
      <header className="explore-page__hero">
        <div>
          <p className="explore-page__kicker">Explore Nepal</p>
          <h1>Find your next destination</h1>
          <p>View location details, then plan your trip in one flow.</p>
        </div>
        <input
          className="explore-page__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, district, province, or category"
        />
      </header>

      {error && <p className="explore-page__error">{error}</p>}
      {loading && <p className="explore-page__hint">Loading destinations...</p>}

      <section className="explore-grid">
        {!loading && filtered.length === 0 && (
          <div className="explore-empty">
            <h2>No matching locations</h2>
            <p>Try another search keyword.</p>
          </div>
        )}

        {filtered.map((location) => (
          <article key={location._id} className="explore-card">
            <div className="explore-card__image">
              {location.image ? (
                <img src={resolveImageUrl(location.image)} alt={location.name} />
              ) : (
                <div className="explore-card__placeholder">{location.name?.slice(0, 1) || "L"}</div>
              )}
            </div>
            <div className="explore-card__body">
              <h2>{location.name}</h2>
              <p className="explore-card__meta">
                {[location.district, location.province, location.category].filter(Boolean).join(" - ")}
              </p>
              <p className="explore-card__desc">
                {location.description?.slice(0, 140) || "No description available."}
                {location.description && location.description.length > 140 ? "..." : ""}
              </p>
              <div className="explore-card__actions">
                <Link to={`/locations/${location._id}`} className="explore-btn explore-btn--ghost">
                  View Details
                </Link>
                <Link to={`/plan-trip?locationId=${location._id}`} className="explore-btn explore-btn--primary">
                  Plan Trip
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>

      <style>{`
        .explore-page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }

        .explore-page__hero {
          display: grid;
          grid-template-columns: 1fr minmax(260px, 380px);
          gap: 16px;
          align-items: center;
          padding: 20px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(34, 197, 94, 0.1));
          border: 1px solid rgba(148, 163, 184, 0.25);
          margin-bottom: 20px;
        }

        .explore-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          color: #0f766e;
          font-weight: 600;
        }

        .explore-page__hero h1 {
          margin: 0 0 6px;
          font-size: clamp(1.8rem, 3vw, 2.5rem);
        }

        .explore-page__hero p {
          margin: 0;
          color: #475569;
        }

        .explore-page__search {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: #fff;
          border-radius: 999px;
          padding: 12px 16px;
          font-size: 0.9rem;
        }

        .explore-page__hint,
        .explore-page__error {
          margin: 0 0 12px;
          font-size: 0.9rem;
        }

        .explore-page__error {
          color: #b91c1c;
        }

        .explore-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .explore-card {
          border-radius: 18px;
          overflow: hidden;
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
          display: grid;
          grid-template-rows: 170px 1fr;
        }

        .explore-card__image img,
        .explore-card__placeholder {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .explore-card__placeholder {
          display: grid;
          place-items: center;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 2rem;
          font-weight: 700;
        }

        .explore-card__body {
          padding: 14px;
          display: grid;
          gap: 8px;
        }

        .explore-card__body h2 {
          margin: 0;
          font-size: 1.2rem;
        }

        .explore-card__meta {
          margin: 0;
          color: #64748b;
          font-size: 0.86rem;
        }

        .explore-card__desc {
          margin: 0;
          color: #334155;
          font-size: 0.9rem;
          min-height: 48px;
        }

        .explore-card__actions {
          display: flex;
          gap: 10px;
          margin-top: 4px;
          flex-wrap: wrap;
        }

        .explore-btn {
          text-decoration: none;
          padding: 9px 12px;
          border-radius: 999px;
          font-size: 0.84rem;
          font-weight: 600;
        }

        .explore-btn--ghost {
          border: 1px solid rgba(15, 118, 110, 0.3);
          color: #0f766e;
          background: #fff;
        }

        .explore-btn--primary {
          border: 1px solid transparent;
          color: #fff;
          background: linear-gradient(135deg, #0284c7, #0f766e);
        }

        .explore-empty {
          grid-column: 1 / -1;
          border: 1px dashed rgba(148, 163, 184, 0.5);
          border-radius: 18px;
          padding: 26px;
          text-align: center;
          background: #fff;
        }

        .explore-empty h2 {
          margin: 0 0 6px;
        }

        .explore-empty p {
          margin: 0;
          color: #64748b;
        }

        @media (max-width: 980px) {
          .explore-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .explore-page__hero {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .explore-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
