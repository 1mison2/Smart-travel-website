import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { resolveImageUrl } from "../utils/api";

function getParentId(location) {
  if (!location?.parentLocationId) return "";
  if (typeof location.parentLocationId === "string") return location.parentLocationId;
  return location.parentLocationId?._id || "";
}

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
    const scoped = locations.slice();
    if (!keyword) return scoped;
    return scoped.filter((location) =>
      [location.name, location.province, location.district, location.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [locations, query]);

  const hubLocations = useMemo(
    () => filtered.filter((location) => !getParentId(location)),
    [filtered]
  );

  const placeLocations = useMemo(
    () => filtered.filter((location) => getParentId(location)),
    [filtered]
  );

  return (
    <div className="explore-page">
      <header className="explore-page__hero">
        <div>
          <p className="explore-page__kicker">Explore Nepal</p>
          <h1>Browse destinations and the places inside them</h1>
          <p>Destination hubs stay separate from actual visitable spots.</p>
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

      {!loading && filtered.length === 0 && (
          <div className="explore-empty">
            <h2>No matching locations</h2>
            <p>Try another search keyword.</p>
          </div>
      )}

      {!!hubLocations.length && (
        <section className="explore-section">
          <div className="explore-section__head">
            <p className="explore-page__kicker">Destinations</p>
            <h2>Major destination hubs</h2>
          </div>
          <div className="explore-grid">
            {hubLocations.map((location) => (
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
                    {[location.district, location.province, location.category || "Destination hub"].filter(Boolean).join(" - ")}
                  </p>
                  <p className="explore-card__desc">
                    {location.description?.slice(0, 140) || "Open this destination to explore places inside it."}
                    {location.description && location.description.length > 140 ? "..." : ""}
                  </p>
                  <div className="explore-card__actions">
                    <Link to={`/locations/${location._id}`} className="explore-btn explore-btn--ghost">
                      Open destination
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {!!placeLocations.length && (
        <section className="explore-section">
          <div className="explore-section__head">
            <p className="explore-page__kicker">Places</p>
            <h2>Places inside destinations</h2>
          </div>
          <div className="explore-grid">
            {placeLocations.map((location) => (
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
                  {location.parentLocationId?.name && (
                    <p className="explore-card__meta">Inside {location.parentLocationId.name}</p>
                  )}
                  <p className="explore-card__desc">
                    {location.description?.slice(0, 140) || "No description available."}
                    {location.description && location.description.length > 140 ? "..." : ""}
                  </p>
                  <div className="explore-card__actions">
                    <Link to={`/locations/${location._id}`} className="explore-btn explore-btn--ghost">
                      View place
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .explore-page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          font-family: "Manrope", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: #1f2937;
        }

        .explore-page__hero {
          display: grid;
          grid-template-columns: 1fr minmax(260px, 380px);
          gap: 16px;
          align-items: center;
          padding: 24px;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 244, 0.9)),
            linear-gradient(135deg, rgba(255, 160, 122, 0.08), rgba(125, 211, 252, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.82);
          box-shadow: 0 22px 40px rgba(15, 23, 42, 0.07);
          margin-bottom: 20px;
          backdrop-filter: blur(14px);
        }

        .explore-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
        }

        .explore-page__hero h1 {
          margin: 0 0 6px;
          font-size: clamp(2rem, 3vw, 3rem);
          font-family: "Playfair Display", serif;
          letter-spacing: -0.04em;
        }

        .explore-page__hero p {
          margin: 0;
          color: #475569;
        }

        .explore-page__search {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.18);
          background: rgba(255, 255, 255, 0.92);
          border-radius: 999px;
          padding: 12px 16px;
          font-size: 0.9rem;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
        }

        .explore-page__hint,
        .explore-page__error {
          margin: 0 0 12px;
          font-size: 0.9rem;
        }

        .explore-page__error {
          color: #b91c1c;
        }

        .explore-section {
          margin-top: 20px;
        }

        .explore-section__head {
          margin-bottom: 14px;
        }

        .explore-section__head h2 {
          margin: 8px 0 0;
          font-size: 1.8rem;
          letter-spacing: -0.04em;
        }

        .explore-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .explore-card {
          border-radius: 24px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.82);
          box-shadow: 0 18px 32px rgba(15, 23, 42, 0.07);
          display: grid;
          grid-template-rows: 170px 1fr;
          backdrop-filter: blur(14px);
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
          margin-top: 6px;
        }

        .explore-btn {
          text-decoration: none;
          padding: 9px 12px;
          border-radius: 999px;
          font-size: 0.84rem;
          font-weight: 600;
        }

        .explore-btn--ghost {
          border: 1px solid rgba(148, 163, 184, 0.14);
          color: var(--primary-dark);
          background: rgba(255, 255, 255, 0.92);
        }

        .explore-btn--primary {
          border: 1px solid transparent;
          color: #fff;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        }

        .explore-empty {
          grid-column: 1 / -1;
          border: 1px dashed rgba(148, 163, 184, 0.4);
          border-radius: 22px;
          padding: 26px;
          text-align: center;
          background: rgba(255, 255, 255, 0.86);
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
