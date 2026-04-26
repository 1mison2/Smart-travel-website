import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarRange, Compass, MapPinned, Route, Sparkles, Wallet } from "lucide-react";
import api from "../utils/api";

const formatCurrency = (value) => `NPR ${Number(value || 0).toLocaleString()}`;

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

  const summary = useMemo(() => {
    const now = new Date();
    const upcoming = trips.filter((trip) => new Date(trip.startDate) >= now);
    const itineraryTrips = trips.filter((trip) => trip.sourceType === "itinerary");
    const totalBudget = trips.reduce((sum, trip) => sum + Number(trip.displayPrice || trip.price || 0), 0);
    const totalDistance = trips.reduce((sum, trip) => sum + Number(trip.totalDistanceKm || 0), 0);

    return {
      totalTrips: trips.length,
      upcomingTrips: upcoming.length,
      itineraryTrips: itineraryTrips.length,
      totalBudget,
      totalDistance,
    };
  }, [trips]);

  return (
    <div className="trips-page">
      <header className="trips-page__hero">
        <div className="trips-page__hero-copy">
          <p className="trips-page__kicker">My Trips</p>
          <h1>Your saved journeys, routes, and AI plans.</h1>
          <p className="trips-page__lead">
            Track your upcoming plans, estimated budgets, and route coverage in one place before your next demo.
          </p>
        </div>

        <div className="trips-page__actions">
          <Link to="/explore" className="trips-btn trips-btn--ghost">Explore</Link>
          <Link to="/map-explorer" className="trips-btn trips-btn--ghost">Map Explorer</Link>
          <Link to="/itinerary-planner" className="trips-btn trips-btn--primary">AI Trip Planner</Link>
        </div>
      </header>

      <section className="trips-stats">
        <article className="trips-stat">
          <span className="trips-stat__icon"><CalendarRange size={17} /></span>
          <div>
            <p>Total saved</p>
            <strong>{summary.totalTrips}</strong>
          </div>
        </article>
        <article className="trips-stat">
          <span className="trips-stat__icon"><Compass size={17} /></span>
          <div>
            <p>Upcoming trips</p>
            <strong>{summary.upcomingTrips}</strong>
          </div>
        </article>
        <article className="trips-stat">
          <span className="trips-stat__icon"><Sparkles size={17} /></span>
          <div>
            <p>AI itineraries</p>
            <strong>{summary.itineraryTrips}</strong>
          </div>
        </article>
        <article className="trips-stat">
          <span className="trips-stat__icon"><Wallet size={17} /></span>
          <div>
            <p>Total planned budget</p>
            <strong>{formatCurrency(summary.totalBudget)}</strong>
          </div>
        </article>
        <article className="trips-stat">
          <span className="trips-stat__icon"><Route size={17} /></span>
          <div>
            <p>Mapped distance</p>
            <strong>{summary.totalDistance > 0 ? `${summary.totalDistance.toFixed(1)} km` : "--"}</strong>
          </div>
        </article>
      </section>

      {error && <p className="trips-page__error">{error}</p>}
      {loading && <p className="trips-page__hint">Loading your trips...</p>}

      <section className="trips-list">
        {!loading && trips.length === 0 && (
          <div className="trips-empty">
            <h2>No saved trips yet</h2>
            <p>Start from the AI planner or create a manual trip to populate your next-week presentation.</p>
            <div className="trips-empty__actions">
              <Link to="/itinerary-planner" className="trips-btn trips-btn--primary">AI Trip Planner</Link>
              <Link to="/explore" className="trips-btn trips-btn--ghost">Explore destinations</Link>
            </div>
          </div>
        )}

        {trips.map((trip) => {
          const isAi = trip.sourceType === "itinerary";
          const stopPreview = Array.isArray(trip.stopsPreview) ? trip.stopsPreview.filter(Boolean) : [];
          const tags = [
            ...(Array.isArray(trip.interests) ? trip.interests : []),
            ...(Array.isArray(trip.categories) ? trip.categories : []),
          ].filter(Boolean).slice(0, 5);

          return (
            <article key={`${trip.sourceType}-${trip._id}`} className="trip-card">
              <div className="trip-card__top">
                <div>
                  <div className="trip-card__eyebrow-row">
                    <span className={`trip-card__type ${isAi ? "trip-card__type--ai" : "trip-card__type--manual"}`}>
                      {isAi ? "AI itinerary" : "Manual trip"}
                    </span>
                    <span className="trip-card__dates">
                      {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                    </span>
                  </div>
                  <h2>{trip.title}</h2>
                  <p className="trip-card__summary">{trip.summary || "No summary added."}</p>
                </div>

                <div className="trip-card__price">
                  <span>Estimated</span>
                  <strong>{formatCurrency(trip.displayPrice || trip.price || 0)}</strong>
                </div>
              </div>

              <div className="trip-card__metrics">
                <div className="trip-card__metric">
                  <CalendarRange size={16} />
                  <span>{trip.durationDays || countTripDays(trip.startDate, trip.endDate)} day trip</span>
                </div>
                <div className="trip-card__metric">
                  <MapPinned size={16} />
                  <span>{trip.stopCount ? `${trip.stopCount} mapped stop(s)` : "Route stops not added yet"}</span>
                </div>
                <div className="trip-card__metric">
                  <Route size={16} />
                  <span>{trip.totalDistanceKm ? `${trip.totalDistanceKm.toFixed(1)} km route` : "Distance available after mapped stops"}</span>
                </div>
              </div>

              {stopPreview.length > 0 && (
                <div className="trip-card__section">
                  <p className="trip-card__label">Highlighted stops</p>
                  <div className="trip-card__chips">
                    {stopPreview.map((stop) => (
                      <span key={stop} className="trip-card__chip">{stop}</span>
                    ))}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <div className="trip-card__section">
                  <p className="trip-card__label">Trip themes</p>
                  <div className="trip-card__chips">
                    {tags.map((tag) => (
                      <span key={tag} className="trip-card__chip trip-card__chip--soft">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="trip-card__actions">
                {trip.detailPath ? (
                  <Link to={trip.detailPath} className="trips-btn trips-btn--primary">View itinerary</Link>
                ) : (
                  <Link to="/explore" className="trips-btn trips-btn--primary">Plan around this trip</Link>
                )}
                <Link to="/map-explorer" className="trips-btn trips-btn--ghost">Open map</Link>
              </div>
            </article>
          );
        })}
      </section>

      <style>{`
        .trips-page {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 20px 64px;
          font-family: "Manrope", "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif;
          color: #162235;
        }

        .trips-page__hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 18px;
          padding: 28px;
          border-radius: 32px;
          margin-bottom: 18px;
          background:
            radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 24%),
            linear-gradient(135deg, rgba(13, 41, 76, 0.98), rgba(35, 118, 170, 0.94) 58%, rgba(20, 146, 124, 0.84));
          color: #fff;
          box-shadow: 0 26px 60px rgba(15, 23, 42, 0.14);
        }

        .trips-page__hero-copy {
          max-width: 720px;
        }

        .trips-page__kicker {
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.74rem;
          color: rgba(220, 238, 255, 0.76);
          font-weight: 800;
        }

        .trips-page__hero h1 {
          margin: 0;
          font-size: clamp(2.2rem, 4vw, 3.8rem);
          line-height: 0.95;
          letter-spacing: -0.05em;
          max-width: 12ch;
        }

        .trips-page__lead {
          margin: 14px 0 0;
          color: rgba(238, 245, 252, 0.9);
          line-height: 1.7;
          max-width: 56ch;
        }

        .trips-page__actions,
        .trips-empty__actions,
        .trip-card__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .trips-stats {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 18px;
        }

        .trips-stat,
        .trip-card,
        .trips-empty {
          border-radius: 24px;
          border: 1px solid rgba(221, 230, 239, 0.95);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.06);
        }

        .trips-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
        }

        .trips-stat__icon {
          width: 42px;
          height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(16, 185, 129, 0.12));
          color: #155e75;
        }

        .trips-stat p,
        .trip-card__label {
          margin: 0 0 4px;
          color: #64748b;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
        }

        .trips-stat strong {
          font-size: 1rem;
          color: #0f172a;
        }

        .trips-btn {
          text-decoration: none;
          border-radius: 999px;
          padding: 10px 15px;
          font-size: 0.88rem;
          font-weight: 700;
        }

        .trips-btn--primary {
          color: #fff;
          background: linear-gradient(135deg, #f97316, #fb7185);
          box-shadow: 0 16px 28px rgba(249, 115, 22, 0.2);
        }

        .trips-btn--ghost {
          color: #0f4c75;
          background: #fff;
          border: 1px solid rgba(15, 76, 117, 0.16);
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
          gap: 14px;
        }

        .trip-card {
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .trip-card__top {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: flex-start;
        }

        .trip-card__eyebrow-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 8px;
        }

        .trip-card__type,
        .trip-card__chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 8px 12px;
        }

        .trip-card__type--ai {
          background: rgba(249, 115, 22, 0.12);
          color: #c2410c;
        }

        .trip-card__type--manual {
          background: rgba(14, 165, 233, 0.12);
          color: #0369a1;
        }

        .trip-card__dates {
          color: #475569;
          font-size: 0.86rem;
          font-weight: 700;
        }

        .trip-card h2 {
          margin: 0 0 8px;
          font-size: clamp(1.25rem, 2vw, 1.5rem);
          color: #0f172a;
        }

        .trip-card__summary {
          margin: 0;
          color: #334155;
          line-height: 1.7;
          max-width: 68ch;
        }

        .trip-card__price {
          min-width: 150px;
          text-align: right;
          padding: 14px 16px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(246,250,253,0.98), rgba(240,247,252,0.95));
          border: 1px solid rgba(216, 228, 239, 0.95);
        }

        .trip-card__price span {
          display: block;
          margin-bottom: 6px;
          color: #64748b;
          font-size: 0.76rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .trip-card__price strong {
          color: #0f4c75;
          font-size: 1.05rem;
        }

        .trip-card__metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .trip-card__metric {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: rgba(248, 250, 252, 0.92);
          color: #334155;
          font-size: 0.9rem;
          min-width: 0;
        }

        .trip-card__metric svg {
          color: #0f766e;
          flex: 0 0 auto;
        }

        .trip-card__section {
          display: grid;
          gap: 10px;
        }

        .trip-card__chips {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .trip-card__chip {
          background: rgba(226, 232, 240, 0.62);
          color: #1e293b;
        }

        .trip-card__chip--soft {
          background: rgba(224, 242, 254, 0.75);
          color: #075985;
        }

        .trips-empty {
          padding: 34px;
          text-align: center;
          display: grid;
          gap: 12px;
          justify-items: center;
        }

        .trips-empty h2,
        .trips-empty p {
          margin: 0;
        }

        .trips-empty p {
          color: #64748b;
          max-width: 42ch;
          line-height: 1.7;
        }

        @media (max-width: 1040px) {
          .trips-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 780px) {
          .trips-page__hero,
          .trip-card__top,
          .trip-card__metrics {
            grid-template-columns: 1fr;
            display: grid;
          }

          .trip-card__price {
            text-align: left;
          }
        }

        @media (max-width: 620px) {
          .trips-page {
            padding-inline: 14px;
          }

          .trips-page__hero {
            padding: 22px;
            border-radius: 26px;
          }

          .trips-stats {
            grid-template-columns: 1fr;
          }

          .trip-card,
          .trips-empty {
            border-radius: 20px;
          }

          .trip-card__metrics {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function countTripDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const difference = end.getTime() - start.getTime();
  return Math.max(1, Math.round(difference / (1000 * 60 * 60 * 24)) + 1);
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
