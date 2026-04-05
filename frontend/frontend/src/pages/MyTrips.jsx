import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../utils/api";

export default function MyTrips() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadTrips = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/api/user/recent-trips");
        if (!active) return;
        setTrips(Array.isArray(data?.trips) ? data.trips : []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load trips");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTrips();
    return () => {
      active = false;
    };
  }, []);

  const upcomingCount = useMemo(() => {
    const now = new Date();
    return trips.filter((trip) => new Date(trip.startDate) >= now).length;
  }, [trips]);

  return (
    <div className="trips-page">
      <header className="trips-page__hero">
        <div>
          <p className="trips-page__kicker">My Trips</p>
          <h1>Your AI itineraries</h1>
          <p>{upcomingCount} upcoming trip(s) out of {trips.length} saved itinerary(ies).</p>
        </div>
        <div className="trips-page__actions">
          <Link to="/explore" className="trips-btn trips-btn--ghost">Explore</Link>
          <Link to="/trip-packages" className="trips-btn trips-btn--ghost">Trip Packages</Link>
          <Link to="/itinerary-planner" className="trips-btn trips-btn--primary">AI Trip Planner</Link>
        </div>
      </header>

      {error && <p className="trips-page__error">{error}</p>}
      {loading && <p className="trips-page__hint">Loading your trips...</p>}

      <section className="trips-list">
        {!loading && trips.length === 0 && (
          <div className="trips-empty">
            <h2>No saved trips yet</h2>
            <p>Start from the AI planner to create your first itinerary.</p>
            <Link to="/itinerary-planner" className="trips-btn trips-btn--primary">AI Trip Planner</Link>
          </div>
        )}

        {trips.map((trip) => (
          <article key={trip._id} className="trip-card">
            <div className="trip-card__head">
              <h2>{trip.title}</h2>
              <span className="trip-card__price">${trip.price || 0}</span>
            </div>
            <p className="trip-card__dates">
              {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
            </p>
            <p className="trip-card__summary">{trip.summary || "No summary added."}</p>
          </article>
        ))}
      </section>

      <style>{`
        .trips-page {
          max-width: 1080px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          font-family: "Manrope", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: #1f2937;
        }

        .trips-page__hero {
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 244, 0.9)),
            linear-gradient(135deg, rgba(255, 160, 122, 0.08), rgba(125, 211, 252, 0.08));
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 28px;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          box-shadow: 0 22px 40px rgba(15, 23, 42, 0.07);
          backdrop-filter: blur(14px);
        }

        .trips-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 700;
        }

        .trips-page__hero h1 {
          margin: 0 0 6px;
          font-size: clamp(2rem, 3vw, 3rem);
          font-family: "Playfair Display", serif;
          letter-spacing: -0.04em;
        }

        .trips-page__hero p {
          margin: 0;
          color: #475569;
        }

        .trips-page__actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .trips-btn {
          text-decoration: none;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 0.88rem;
          font-weight: 600;
        }

        .trips-btn--primary {
          color: #fff;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        }

        .trips-btn--ghost {
          color: var(--primary-dark);
          background: #fff;
          border: 1px solid var(--border);
        }

        .trips-page__error,
        .trips-page__hint {
          margin: 0 0 12px;
          font-size: 0.9rem;
        }

        .trips-page__error {
          color: #b91c1c;
        }

        .trips-list {
          display: grid;
          gap: 12px;
        }

        .trip-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 16px 30px rgba(15, 23, 42, 0.06);
          display: grid;
          gap: 6px;
          backdrop-filter: blur(14px);
        }

        .trip-card__head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .trip-card__head h2 {
          margin: 0;
          font-size: 1.1rem;
        }

        .trip-card__price {
          font-weight: 700;
          color: var(--primary-dark);
        }

        .trip-card__dates {
          margin: 0;
          color: #475569;
          font-size: 0.86rem;
          font-weight: 600;
        }

        .trip-card__summary {
          margin: 0;
          color: #334155;
          line-height: 1.6;
        }

        .trips-empty {
          border: 1px dashed rgba(148, 163, 184, 0.42);
          border-radius: 22px;
          padding: 28px;
          text-align: center;
          background: rgba(255, 255, 255, 0.86);
          display: grid;
          gap: 10px;
          justify-items: center;
        }

        .trips-empty h2 {
          margin: 0;
        }

        .trips-empty p {
          margin: 0;
          color: #64748b;
        }

        @media (max-width: 720px) {
          .trips-page__hero {
            flex-direction: column;
            align-items: flex-start;
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
