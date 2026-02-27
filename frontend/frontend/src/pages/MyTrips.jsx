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
          <h1>Your travel plans</h1>
          <p>{upcomingCount} upcoming trip(s) out of {trips.length} total saved plan(s).</p>
        </div>
        <div className="trips-page__actions">
          <Link to="/explore" className="trips-btn trips-btn--ghost">Explore</Link>
          <Link to="/plan-trip" className="trips-btn trips-btn--primary">New Trip Plan</Link>
        </div>
      </header>

      {error && <p className="trips-page__error">{error}</p>}
      {loading && <p className="trips-page__hint">Loading your trips...</p>}

      <section className="trips-list">
        {!loading && trips.length === 0 && (
          <div className="trips-empty">
            <h2>No saved trips yet</h2>
            <p>Start from Explore and create your first plan.</p>
            <Link to="/explore" className="trips-btn trips-btn--primary">Explore Locations</Link>
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
          max-width: 920px;
          margin: 0 auto;
          padding: 28px 20px 60px;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }

        .trips-page__hero {
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.16), rgba(34, 197, 94, 0.1));
          border: 1px solid rgba(148, 163, 184, 0.26);
          border-radius: 24px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }

        .trips-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          color: #0f766e;
          font-weight: 600;
        }

        .trips-page__hero h1 {
          margin: 0 0 6px;
          font-size: clamp(1.8rem, 3vw, 2.4rem);
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
          background: linear-gradient(135deg, #0284c7, #0f766e);
        }

        .trips-btn--ghost {
          color: #0f766e;
          background: #fff;
          border: 1px solid rgba(15, 118, 110, 0.3);
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
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.07);
          display: grid;
          gap: 6px;
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
          color: #0f766e;
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
          border: 1px dashed rgba(148, 163, 184, 0.55);
          border-radius: 18px;
          padding: 28px;
          text-align: center;
          background: #fff;
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
