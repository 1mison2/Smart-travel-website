import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../utils/api";

export default function ItineraryDetails() {
  const { id } = useParams();
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadItinerary = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/api/itineraries/${id}`);
        if (!active) return;
        setItinerary(data?.itinerary || null);
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load itinerary");
        setItinerary(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (id) {
      loadItinerary();
    } else {
      setLoading(false);
      setError("Missing itinerary id");
    }

    return () => {
      active = false;
    };
  }, [id]);

  const routeMeta = useMemo(() => {
    const places = (itinerary?.days || []).flatMap((day) => day?.places || []);
    const distanceKm = places.reduce((sum, place, index) => {
      if (index === 0) return 0;
      return sum + calculateDistanceKm(places[index - 1], place);
    }, 0);

    return {
      stopCount: places.length,
      distanceKm,
    };
  }, [itinerary]);

  const getDayRoutePath = (day) => {
    const params = new URLSearchParams({
      itineraryId: id,
      day: String(day?.day || ""),
    });
    return `/map-explorer?${params.toString()}`;
  };

  return (
    <div className="itinerary-page">
      <header className="itinerary-page__hero">
        <div className="itinerary-page__nav">
          <Link to="/dashboard" className="itinerary-btn itinerary-btn--ghost">Dashboard</Link>
          <Link to="/my-trips" className="itinerary-btn itinerary-btn--ghost">My Trips</Link>
        </div>
        <div>
          <p className="itinerary-page__kicker">Itinerary</p>
          <h1>{itinerary?.destination || "Your itinerary"}</h1>
          {itinerary && (
            <p>
              {itinerary.durationDays} day(s) | Budget NPR {Number(itinerary.budget || 0).toLocaleString()} | Estimated
              NPR {Number(itinerary.totalEstimatedCost || 0).toLocaleString()} | {routeMeta.stopCount} stops |{" "}
              {routeMeta.distanceKm > 0 ? `${routeMeta.distanceKm.toFixed(1)} km route` : "distance pending"}
            </p>
          )}
        </div>
        <Link to="/itinerary-planner" className="itinerary-btn itinerary-btn--primary">Create New</Link>
      </header>

      {loading && <p className="itinerary-page__hint">Loading itinerary...</p>}
      {error && <p className="itinerary-page__error">{error}</p>}

      {!loading && !error && !itinerary && (
        <div className="itinerary-empty">
          <h2>No itinerary found</h2>
          <p>Generate a new one in the planner.</p>
          <Link to="/itinerary-planner" className="itinerary-btn itinerary-btn--primary">Go to Planner</Link>
        </div>
      )}

      {!loading && !error && itinerary && (
        <section className="itinerary-days">
          {(itinerary.days || []).map((day) => (
            <article key={day.day} className="itinerary-day">
              <div className="itinerary-day__head">
                <div>
                  <p className="itinerary-day__badge">Day {day.day}</p>
                  <h2>{day.title}</h2>
                </div>
                <div className="itinerary-day__actions">
                  <div className="itinerary-day__cost">Estimated NPR {Number(day.estimatedCost || 0).toLocaleString()}</div>
                  {(day.places || []).length > 0 ? (
                    <Link to={getDayRoutePath(day)} className="itinerary-btn itinerary-btn--primary">
                      View Day Route
                    </Link>
                  ) : null}
                </div>
              </div>
              {day.notes && <p className="itinerary-day__notes">{day.notes}</p>}
              <div className="itinerary-places">
                {(day.places || []).map((place, index) => (
                  <div key={`${place.name}-${index}`} className="itinerary-place">
                    <div className="itinerary-place__image">
                      {place.image ? (
                        <img src={place.image} alt={place.name} />
                      ) : (
                        <div className="itinerary-place__placeholder">No image</div>
                      )}
                    </div>
                    <div className="itinerary-place__body">
                      <h3>{place.name}</h3>
                      <p className="itinerary-place__meta">{place.category || "attraction"}</p>
                      <p className="itinerary-place__cost">Estimated NPR {Number(place.estimatedCost || 0).toLocaleString()}</p>
                      {place.notes && <p className="itinerary-place__notes">{place.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      <style>{`
        .itinerary-page {
          width: min(100% - 48px, 1400px);
          margin: 0 auto;
          padding: 24px 0 60px;
          font-family: "Plus Jakarta Sans", "Sora", "DM Sans", system-ui, sans-serif;
          color: #0f172a;
        }

        .itinerary-page__hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(34, 197, 94, 0.12));
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 24px;
          padding: 24px 26px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        .itinerary-page__nav {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .itinerary-page__kicker {
          margin: 0 0 6px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 0.72rem;
          color: #0f766e;
          font-weight: 600;
        }

        .itinerary-page__hero h1 {
          margin: 0 0 6px;
          font-size: clamp(1.8rem, 3vw, 2.4rem);
        }

        .itinerary-page__hero p {
          margin: 0;
          color: #475569;
        }

        .itinerary-btn {
          text-decoration: none;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 0.88rem;
          font-weight: 600;
          display: inline-block;
        }

        .itinerary-btn--primary {
          color: #fff;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
        }

        .itinerary-btn--ghost {
          color: var(--primary-dark);
          background: #fff;
          border: 1px solid var(--border);
        }

        .itinerary-page__hint,
        .itinerary-page__error {
          margin: 0 0 12px;
          font-size: 0.9rem;
        }

        .itinerary-page__error {
          color: #b91c1c;
        }

        .itinerary-empty {
          border: 1px dashed rgba(148, 163, 184, 0.55);
          border-radius: 18px;
          padding: 28px;
          text-align: center;
          background: #fff;
          display: grid;
          gap: 10px;
          justify-items: center;
        }

        .itinerary-days {
          display: grid;
          gap: 18px;
        }

        .itinerary-day {
          background: #fff;
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 22px;
          padding: 20px;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          display: grid;
          gap: 16px;
        }

        .itinerary-day__head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .itinerary-day__badge {
          margin: 0 0 6px;
          font-size: 0.78rem;
          color: #0f766e;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-weight: 600;
        }

        .itinerary-day h2 {
          margin: 0;
          font-size: 1.2rem;
        }

        .itinerary-day__cost {
          font-weight: 700;
          color: #0f766e;
        }

        .itinerary-day__actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .itinerary-day__notes {
          margin: 0;
          color: #475569;
        }

        .itinerary-places {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .itinerary-place {
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 16px;
          overflow: hidden;
          background: #f8fafc;
          display: grid;
          grid-template-rows: 140px 1fr;
        }

        .itinerary-place__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .itinerary-place__placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #94a3b8;
          font-size: 0.85rem;
          background: #e2e8f0;
        }

        .itinerary-place__body {
          padding: 12px;
          display: grid;
          gap: 4px;
        }

        .itinerary-place__body h3 {
          margin: 0;
          font-size: 1rem;
        }

        .itinerary-place__meta {
          margin: 0;
          color: #64748b;
          font-size: 0.85rem;
        }

        .itinerary-place__cost {
          margin: 0;
          font-weight: 600;
          color: #0f766e;
          font-size: 0.88rem;
        }

        .itinerary-place__notes {
          margin: 0;
          color: #475569;
          font-size: 0.85rem;
        }

        @media (max-width: 720px) {
          .itinerary-page {
            width: min(100% - 28px, 1400px);
            padding-top: 16px;
          }

          .itinerary-page__hero {
            align-items: flex-start;
            padding: 18px;
          }
        }
      `}</style>
    </div>
  );
}

function toRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function calculateDistanceKm(from, to) {
  const fromLat = Number(from?.latitude);
  const fromLng = Number(from?.longitude);
  const toLat = Number(to?.latitude);
  const toLng = Number(to?.longitude);

  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return 0;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(toLat - fromLat);
  const deltaLng = toRadians(toLng - fromLng);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
